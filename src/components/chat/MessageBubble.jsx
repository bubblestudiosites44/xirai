import React from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, User } from "lucide-react";

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
      )}

      <div
        className={`
          max-w-[82%] rounded-2xl px-4 py-3 shadow-lg shadow-black/10
          ${
            isUser
              ? "bg-primary/15 border border-primary/20 text-foreground"
              : "bg-card/90 border border-white/10 text-foreground backdrop-blur-xl"
          }
        `}
      >
        {message.attachments?.length > 0 && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            {message.attachments.map((attachment) => (
              <img
                key={attachment.id || attachment.dataUrl}
                src={attachment.dataUrl}
                alt={attachment.name || "Uploaded image"}
                className="max-h-52 rounded-xl border border-white/10 object-cover"
              />
            ))}
          </div>
        )}
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : (
          <ReactMarkdown
            className="text-sm prose prose-sm prose-invert max-w-none
              prose-p:leading-relaxed prose-p:my-1.5
              prose-headings:text-foreground prose-headings:font-display
              prose-strong:text-primary prose-strong:font-semibold
              prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
              prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-xl
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-li:my-0.5
              prose-ul:my-2 prose-ol:my-2"
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
