import React, { useState } from "react";
import { Plus, MessageSquare, Trash2, Pencil, Check, X, Sparkles, LogIn, LogOut, User } from "lucide-react";
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
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed md:relative z-40 top-0 left-0 h-full
          w-72 border-r border-white/10 bg-black/50 backdrop-blur-2xl
          flex flex-col transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Logo */}
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 shadow-lg shadow-primary/10">
              <Sparkles className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-lg font-semibold tracking-tight text-foreground">
                XirAI
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                by Xirako
              </p>
            </div>
          </div>
        </div>

        {/* New Chat */}
        <div className="p-3">
          <Button
            onClick={onCreate}
            className="w-full justify-start gap-2.5 rounded-full border border-primary/25 bg-primary/10 font-medium text-primary hover:bg-primary/20"
            variant="ghost"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>

        {/* Conversations */}
        <ScrollArea className="flex-1 px-3">
          <div className="space-y-0.5 pb-4">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`
                  group flex items-center gap-2 rounded-xl px-3 py-2.5 cursor-pointer
                  transition-all duration-150
                  ${
                    activeId === conv.id
                      ? "bg-white/[0.08] text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-white/[0.05] hover:text-sidebar-foreground"
                  }
                `}
                onClick={() => {
                  onSelect(conv.id);
                  onClose();
                }}
              >
                <MessageSquare className="w-4 h-4 shrink-0 opacity-60" />

                {editingId === conv.id ? (
                  <div className="flex-1 flex items-center gap-1">
                    <input
                      className="flex-1 bg-transparent text-sm outline-none border-b border-primary/40 text-foreground"
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
                      className="p-0.5 hover:text-primary"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(null);
                      }}
                      className="p-0.5 hover:text-destructive"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm truncate">{conv.title}</span>
                    <div className="hidden group-hover:flex items-center gap-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(conv);
                        }}
                        className="p-1 rounded hover:bg-white/10"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(conv.id);
                        }}
                        className="p-1 rounded hover:bg-destructive/20 hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer — sign in / user */}
        <div className="border-t border-white/10 p-3">
          {user ? (
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {user.user_metadata?.display_name || user.email}
                </p>
                {user.user_metadata?.display_name && (
                  <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                )}
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
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
              className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg
                bg-primary/10 hover:bg-primary/20 border border-primary/20
                text-primary font-medium text-sm transition-all duration-200"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              Sign in with Xirako
            </a>
          )}
        </div>
      </aside>
    </>
  );
}
