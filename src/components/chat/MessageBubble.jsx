import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Check, Clipboard, Sparkles, User } from "lucide-react";

function CodeBlock({ className = "", children }) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, "");
  const language = className.match(/language-(\w+)/)?.[1] || "code";

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-white/10 bg-[#050909] shadow-lg shadow-black/20">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.035] px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {language}
        </span>
        <button
          type="button"
          onClick={copyCode}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:bg-white/[0.08] hover:text-foreground"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Clipboard className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-white/88">
        <code className={className}>{code}</code>
      </pre>
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/15">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
      )}

      <div
        className={`min-w-0 rounded-[1.35rem] px-4 py-3 shadow-lg shadow-black/10 ${
          isUser
            ? "max-w-[78%] border border-primary/20 bg-primary/15 text-foreground"
            : "w-full max-w-full border border-white/10 bg-card/90 text-foreground backdrop-blur-xl"
        }`}
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
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
        ) : (
          <ReactMarkdown
            components={{
              code({ children, ...props }) {
                return (
                  <code
                    className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              pre({ children }) {
                const codeElement = Array.isArray(children) ? children[0] : children;
                const className = codeElement?.props?.className || "";
                const codeChildren = codeElement?.props?.children || "";
                return <CodeBlock className={className}>{codeChildren}</CodeBlock>;
              },
              img({ src, alt }) {
                return (
                  <a href={src} target="_blank" rel="noreferrer">
                    <img
                      src={src}
                      alt={alt || "Generated image"}
                      className="my-3 max-h-[34rem] w-full rounded-2xl border border-white/10 object-contain"
                    />
                  </a>
                );
              },
            }}
            className="prose prose-sm prose-invert max-w-none text-sm
              prose-p:my-1.5 prose-p:leading-relaxed
              prose-headings:font-heading prose-headings:text-foreground
              prose-strong:font-semibold prose-strong:text-primary
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-li:my-0.5 prose-ul:my-2 prose-ol:my-2"
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>

      {isUser && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
