import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Menu } from "lucide-react";
import Sidebar from "@/components/chat/Sidebar";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import WelcomeScreen from "@/components/chat/WelcomeScreen";
import GlowOrbs from "@/components/chat/GlowOrbs";
import { useAuth } from "@/lib/AuthContext";

const STORAGE_KEY = "xirai.chat.v1";
const ANON_USAGE_KEY = "xirai.anon.messages.v1";
const ANON_MESSAGE_LIMIT = 20;

const makeId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const loadStoredChats = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { conversations: [], messagesByConversation: {} };
    }

    const parsed = JSON.parse(stored);
    const messagesByConversation = Object.fromEntries(
      Object.entries(parsed.messagesByConversation || {}).map(([conversationId, messages]) => [
        conversationId,
        Array.isArray(messages)
          ? messages.map((message) => ({
              ...message,
              isStreaming: false,
            }))
          : [],
      ])
    );

    return {
      conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
      messagesByConversation,
    };
  } catch {
    return { conversations: [], messagesByConversation: {} };
  }
};

const titleFromMessage = (content) => {
  const fallback = "New Chat";
  const title = content.trim().replace(/\s+/g, " ").slice(0, 44);
  return title || fallback;
};

export default function Home() {
  const [store, setStore] = useState(loadStoredChats);
  const [activeId, setActiveId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [anonymousUsage, setAnonymousUsage] = useState(() => {
    const stored = Number(localStorage.getItem(ANON_USAGE_KEY));
    return Number.isFinite(stored) ? stored : 0;
  });
  const { user, isAuthenticated, logout, navigateToLogin } = useAuth();

  const conversations = store.conversations;
  const messages = useMemo(
    () => (activeId ? store.messagesByConversation[activeId] || [] : []),
    [activeId, store.messagesByConversation]
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [store]);

  useEffect(() => {
    localStorage.setItem(ANON_USAGE_KEY, String(anonymousUsage));
  }, [anonymousUsage]);

  const patchStore = (updater) => {
    setStore((current) => {
      const next = updater(current);
      return {
        conversations: next.conversations || current.conversations,
        messagesByConversation: next.messagesByConversation || current.messagesByConversation,
      };
    });
  };

  const createConversation = () => {
    const conv = {
      id: makeId(),
      title: "New Chat",
      created_date: new Date().toISOString(),
    };

    patchStore((current) => ({
      conversations: [conv, ...current.conversations],
      messagesByConversation: {
        ...current.messagesByConversation,
        [conv.id]: [],
      },
    }));
    setActiveId(conv.id);
    setSidebarOpen(false);
  };

  const deleteConversation = (id) => {
    patchStore((current) => {
      const { [id]: _removed, ...remainingMessages } = current.messagesByConversation;
      return {
        conversations: current.conversations.filter((c) => c.id !== id),
        messagesByConversation: remainingMessages,
      };
    });

    if (activeId === id) {
      setActiveId(null);
    }
  };

  const renameConversation = (id, title) => {
    patchStore((current) => ({
      conversations: current.conversations.map((c) => (c.id === id ? { ...c, title } : c)),
    }));
  };

  const addAssistantMessage = (conversationId, message) => {
    patchStore((current) => ({
      messagesByConversation: {
        ...current.messagesByConversation,
        [conversationId]: [...(current.messagesByConversation[conversationId] || []), message],
      },
    }));
  };

  const updateAssistantMessage = (conversationId, messageId, updates) => {
    patchStore((current) => ({
      messagesByConversation: {
        ...current.messagesByConversation,
        [conversationId]: (current.messagesByConversation[conversationId] || []).map((message) =>
          message.id === messageId ? { ...message, ...updates } : message
        ),
      },
    }));
  };

  const sendMessage = async (content, attachments = []) => {
    if (!isAuthenticated && anonymousUsage >= ANON_MESSAGE_LIMIT) {
      const now = new Date().toISOString();
      const currentConvId = activeId || makeId();
      const limitMessage = {
        id: makeId(),
        conversation_id: currentConvId,
        role: "assistant",
        content:
          "You've used the 20 free XirAI messages for guests. Sign in with Xirako to keep chatting.",
        created_date: now,
      };

      patchStore((current) => {
        const hasConversation = current.conversations.some((conv) => conv.id === currentConvId);
        return {
          conversations: hasConversation
            ? current.conversations
            : [
                {
                  id: currentConvId,
                  title: "Guest limit reached",
                  created_date: now,
                },
                ...current.conversations,
              ],
          messagesByConversation: {
            ...current.messagesByConversation,
            [currentConvId]: [...(current.messagesByConversation[currentConvId] || []), limitMessage],
          },
        };
      });
      setActiveId(currentConvId);
      return;
    }

    let currentConvId = activeId;
    const now = new Date().toISOString();

    if (!currentConvId) {
      currentConvId = makeId();
      const conv = {
        id: currentConvId,
        title: titleFromMessage(content),
        created_date: now,
      };

      patchStore((current) => ({
        conversations: [conv, ...current.conversations],
        messagesByConversation: {
          ...current.messagesByConversation,
          [currentConvId]: [],
        },
      }));
      setActiveId(currentConvId);
    }

    const userMsg = {
      id: makeId(),
      conversation_id: currentConvId,
      role: "user",
      content,
      attachments,
      created_date: now,
    };

    const nextMessages = [...(store.messagesByConversation[currentConvId] || []), userMsg];

    patchStore((current) => ({
      messagesByConversation: {
        ...current.messagesByConversation,
        [currentConvId]: nextMessages,
      },
    }));

    if (!isAuthenticated) {
      setAnonymousUsage((usage) => Math.min(usage + 1, ANON_MESSAGE_LIMIT));
    }

    setIsLoading(true);

    const assistantMsg = {
      id: makeId(),
      conversation_id: currentConvId,
      role: "assistant",
      content: "",
      isStreaming: true,
      created_date: new Date().toISOString(),
    };
    addAssistantMessage(currentConvId, assistantMsg);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages.slice(-10),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "XirAI could not reach Groq.");
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("The response stream was unavailable.");
      }

      const decoder = new TextDecoder();
      let responseContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        responseContent += decoder.decode(value, { stream: true });
        updateAssistantMessage(currentConvId, assistantMsg.id, {
          content: responseContent,
          isStreaming: true,
        });
      }

      responseContent += decoder.decode();
      updateAssistantMessage(currentConvId, assistantMsg.id, {
        content: responseContent || "Sorry, I couldn't get a response.",
        isStreaming: false,
      });
    } catch (err) {
      updateAssistantMessage(currentConvId, assistantMsg.id, {
        content: `I hit an API issue: ${err.message}`,
        isStreaming: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background">
      <GlowOrbs />

      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onCreate={createConversation}
        onDelete={deleteConversation}
        onRename={renameConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={logout}
        onLogin={navigateToLogin}
      />

      <main className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="z-10 flex min-h-[4.35rem] items-center gap-3 border-b border-white/10 bg-black/25 px-4 py-3 backdrop-blur-xl">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-foreground transition hover:bg-white/[0.09] md:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h2 className="min-w-0 truncate font-heading text-sm font-semibold text-foreground">
            {activeId ? conversations.find((c) => c.id === activeId)?.title || "Chat" : "XirAI"}
          </h2>
        </div>

        {!activeId && messages.length === 0 ? (
          <WelcomeScreen onSuggestion={sendMessage} />
        ) : (
          <div key={activeId || "empty-chat"} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 md:px-8">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-white/10 bg-black/25 p-4 backdrop-blur-xl">
          <div className="mx-auto w-full max-w-6xl">
            {!isAuthenticated && ANON_MESSAGE_LIMIT - anonymousUsage <= 5 && (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-primary" />
                  {anonymousUsage >= ANON_MESSAGE_LIMIT
                    ? "Guest limit reached."
                    : `${ANON_MESSAGE_LIMIT - anonymousUsage} guest messages left.`}
                </span>
                {anonymousUsage >= ANON_MESSAGE_LIMIT && (
                  <button className="font-semibold text-primary" onClick={navigateToLogin}>
                    Sign in
                  </button>
                )}
              </div>
            )}
            <ChatInput
              onSend={sendMessage}
              isLoading={isLoading}
              isLimited={!isAuthenticated && anonymousUsage >= ANON_MESSAGE_LIMIT}
            />
            <p className="mt-2.5 text-center text-[10px] font-medium tracking-wide text-muted-foreground">
              XirAI can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
