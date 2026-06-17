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

function ImageGenerationAnimation() {
  return (
    <div className="min-h-40 overflow-hidden rounded-2xl border border-primary/20 bg-black/25 p-4">
      <div className="relative h-36 rounded-xl border border-white/10 bg-[radial-gradient(circle_at_30%_30%,rgba(45,245,197,0.34),transparent_34%),radial-gradient(circle_at_72%_68%,rgba(70,190,255,0.28),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))]">
        <div className="absolute inset-y-0 left-[-35%] w-1/3 rotate-12 bg-white/20 blur-2xl animate-[image-scan_2.6s_ease-in-out_infinite]" />
        <div className="absolute left-6 top-6 h-12 w-12 animate-pulse rounded-full border border-primary/30 bg-primary/20" />
        <div className="absolute bottom-5 right-6 h-16 w-24 animate-pulse rounded-[1.4rem] border border-cyan-200/20 bg-cyan-200/10 [animation-delay:500ms]" />
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">Making your image...</p>
      <p className="mt-1 text-xs text-muted-foreground">This usually takes a few seconds.</p>
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
        ) : message.isGeneratingImage ? (
          <ImageGenerationAnimation />
        ) : message.isStreaming && !message.content ? (
          <div className="flex items-center gap-1 py-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:120ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-primary/50 [animation-delay:240ms]" />
          </div>
        ) : (
          <>
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
            {message.isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse rounded-full bg-primary/80" />
            )}
          </>
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
