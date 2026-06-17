import React, { useState } from "react";
import { Check, LogIn, LogOut, MessageSquare, Pencil, Plus, Trash2, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { XIRAKO_LOGIN_URL } from "@/lib/xirakoAuth";

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  isOpen,
  onClose,
  user,
  onLogout,
  onLogin,
  anonymousUsage,
  anonymousLimit,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const startEdit = (conv) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveEdit = (id) => {
    if (editTitle.trim()) {
      onRename(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={onClose} />}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-72 flex-col border-r border-white/10 bg-black/48 backdrop-blur-2xl transition-transform duration-300 ease-out md:relative ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.035] p-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/30">
              <img src="/favicon.png" alt="Xirako" className="h-8 w-8 object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-heading text-base font-semibold tracking-tight text-foreground">
                XirAI
              </h1>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                by Xirako
              </p>
            </div>
          </div>
        </div>

        <div className="p-3">
          <Button
            onClick={onCreate}
            className="w-full justify-start gap-2.5 rounded-full border border-primary/25 bg-primary/10 font-semibold text-primary hover:bg-primary/20"
            variant="ghost"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        <ScrollArea className="flex-1 px-3">
          <div className="space-y-1 pb-4">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 ${
                  activeId === conv.id
                    ? "bg-white/[0.08] text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-white/[0.05] hover:text-sidebar-foreground"
                }`}
                onClick={() => {
                  onSelect(conv.id);
                  onClose();
                }}
              >
                <MessageSquare className="h-4 w-4 shrink-0 opacity-60" />

                {editingId === conv.id ? (
                  <div className="flex min-w-0 flex-1 items-center gap-1">
                    <input
                      className="min-w-0 flex-1 border-b border-primary/40 bg-transparent text-sm text-foreground outline-none"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(conv.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        saveEdit(conv.id);
                      }}
                      className="rounded p-1 hover:bg-white/10 hover:text-primary"
                      aria-label="Save chat name"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(null);
                      }}
                      className="rounded p-1 hover:bg-white/10 hover:text-destructive"
                      aria-label="Cancel rename"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate pr-1">{conv.title}</span>
                    <div className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(conv);
                        }}
                        className="rounded-md p-1 hover:bg-white/10"
                        aria-label="Rename chat"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(conv.id);
                        }}
                        className="rounded-md p-1 hover:bg-destructive/20 hover:text-destructive"
                        aria-label="Delete chat"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t border-white/10 p-3">
          {!user && typeof anonymousUsage === "number" && (
            <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] text-muted-foreground">
              Guest AI messages: {anonymousUsage}/{anonymousLimit}
            </div>
          )}

          {user ? (
            <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/20">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">
                  {user.user_metadata?.display_name || user.email}
                </p>
                {user.user_metadata?.display_name && (
                  <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
                )}
              </div>
              <button
                onClick={onLogout}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <a
              href={XIRAKO_LOGIN_URL}
              onClick={(event) => {
                if (onLogin) {
                  event.preventDefault();
                  onLogin();
                }
              }}
              className="flex w-full items-center gap-2.5 rounded-full border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition-all duration-200 hover:bg-primary/20"
            >
              <LogIn className="h-4 w-4 shrink-0" />
              Sign in with Xirako
            </a>
          )}
        </div>
      </aside>
    </>
  );
}
