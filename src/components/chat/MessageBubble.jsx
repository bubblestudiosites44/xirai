import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Check, Clipboard, Search, Sparkles, User } from "lucide-react";

const POLLINATIONS_IMAGE_BASE = "https://image.pollinations.ai/prompt/";

const buildPollinationsFallbackUrl = (prompt) => {
  const params = new URLSearchParams({
    width: "1024",
    height: "1024",
    model: "flux",
    nologo: "true",
    safe: "true",
    seed: String(Math.floor(Math.random() * 1_000_000)),
  });

  return `${POLLINATIONS_IMAGE_BASE}${encodeURIComponent(prompt)}?${params.toString()}`;
};

const extractImagePromptMetadata = (content = "") => {
  const match = content.match(/xirai-image-prompt:([^\s)]+)/);

  if (!match?.[1]) {
    return "";
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return "";
  }
};

const stripImagePromptMetadata = (content = "") =>
  content
    .replace(/\n?\[Image prompt metadata]\(xirai-image-prompt:[^\s)]+\)\s*/g, "")
    .replace(/\n?Image prompt metadata\s*$/gm, "")
    .trim();

const markdownUrlTransform = (url = "") => {
  const trimmedUrl = url.trim();

  if (/^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  if (trimmedUrl.startsWith("xirai-image-prompt:")) {
    return trimmedUrl;
  }

  if (/^(https?:|mailto:|tel:)/i.test(trimmedUrl) || trimmedUrl.startsWith("/") || trimmedUrl.startsWith("#")) {
    return trimmedUrl;
  }

  return "";
};

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

function GeneratedImage({ src, alt, prompt }) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [didFail, setDidFail] = useState(false);

  useEffect(() => {
    setCurrentSrc(src);
    setDidFail(false);
  }, [src]);

  const handleError = () => {
    if (prompt && !currentSrc?.startsWith(POLLINATIONS_IMAGE_BASE)) {
      setCurrentSrc(buildPollinationsFallbackUrl(prompt));
      return;
    }

    setDidFail(true);
  };

  if (didFail) {
    return (
      <div className="my-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-muted-foreground">
        Image could not load. Try generating it again.
      </div>
    );
  }

  return (
    <a href={currentSrc} target="_blank" rel="noreferrer">
      <img
        src={currentSrc}
        alt={alt || "Generated image"}
        onError={handleError}
        className="my-3 max-h-[34rem] w-full rounded-2xl border border-white/10 object-contain"
      />
    </a>
  );
}

function ImageGenerationAnimation() {
  return (
    <div className="overflow-hidden rounded-[1.65rem] border border-primary/20 bg-black/30 p-4 shadow-2xl shadow-primary/5">
      <div className="relative h-44 overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#061010] sm:h-52">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(1,7,8,0.98)_0%,rgba(3,28,27,0.82)_44%,rgba(1,7,8,0.98)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,rgba(45,245,197,0.34),transparent_30%),radial-gradient(circle_at_78%_54%,rgba(83,205,255,0.26),transparent_35%),radial-gradient(circle_at_55%_92%,rgba(0,245,228,0.18),transparent_34%)] animate-[color-drift_5.8s_ease-in-out_infinite_alternate]" />
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,.14)_0.7px,transparent_0.7px)] [background-size:3px_3px]" />
        <div className="absolute inset-y-[-35%] left-[-45%] w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/25 to-transparent blur-2xl animate-[xirako-sweep_3.8s_ease-in-out_infinite]" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Making your image...</p>
          <p className="mt-1 text-xs text-muted-foreground">Composing colors, lighting, and detail.</p>
        </div>
        <Sparkles className="h-5 w-5 animate-pulse text-primary" />
      </div>
    </div>
  );
}

function WebSearchAnimation() {
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
      <div className="flex items-center gap-3">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10">
          <Search className="h-5 w-5 text-primary" />
          <span className="absolute inset-0 rounded-full border border-primary/30 animate-[search-ping_1.8s_ease-out_infinite]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Searching the web...</p>
          <p className="mt-1 text-xs text-muted-foreground">Checking current sources before answering.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {[0, 1, 2].map((index) => (
          <div key={index} className="overflow-hidden rounded-full border border-white/10 bg-white/[0.035] p-2">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-primary/20 via-primary/60 to-primary/20 animate-[search-shimmer_1.45s_ease-in-out_infinite]"
              style={{ animationDelay: `${index * 140}ms` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const imagePrompt = useMemo(() => extractImagePromptMetadata(message.content), [message.content]);
  const displayContent = useMemo(() => stripImagePromptMetadata(message.content), [message.content]);

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
        ) : message.isSearchingWeb && !message.content ? (
          <WebSearchAnimation />
        ) : message.isStreaming && !message.content ? (
          <div className="flex items-center gap-1 py-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:120ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-primary/50 [animation-delay:240ms]" />
          </div>
        ) : (
          <>
            <ReactMarkdown
              urlTransform={markdownUrlTransform}
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
                a({ href, children, ...props }) {
                  const text = React.Children.toArray(children).join("").trim();

                  if (href?.startsWith("xirai-image-prompt:") || text === "Image prompt metadata") {
                    return null;
                  }

                  return (
                    <a href={href} {...props}>
                      {children}
                    </a>
                  );
                },
                img({ src, alt }) {
                  return <GeneratedImage src={src} alt={alt} prompt={imagePrompt} />;
                },
              }}
              className="prose prose-sm prose-invert max-w-none text-sm
                prose-p:my-1.5 prose-p:leading-relaxed
                prose-headings:font-heading prose-headings:text-foreground
                prose-strong:font-semibold prose-strong:text-primary
                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                prose-li:my-0.5 prose-ul:my-2 prose-ol:my-2"
            >
              {displayContent}
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
