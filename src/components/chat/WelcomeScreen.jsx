import React from "react";
import { Sparkles, Zap, Code, Image } from "lucide-react";

const suggestions = [
  { icon: Zap, text: "Draft a launch plan for ai.xirako.com" },
  { icon: Image, text: "What can you help me understand from an uploaded image?" },
  { icon: Code, text: "Write a clean React component for a product card" },
];

export default function WelcomeScreen({ onSuggestion }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/25 bg-primary/15 shadow-2xl shadow-primary/10">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>

      <h2 className="mb-2 font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
        Hey, this is XirAI
      </h2>
      <p className="mb-10 max-w-md text-sm leading-relaxed text-muted-foreground">
        Your AI assistant by Xirako. Crafted to feel fast, clear, and cinematic.
        Ask me anything.
      </p>

      <div className="grid w-full max-w-lg gap-3">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggestion(s.text)}
            className="group flex items-center gap-3 rounded-2xl border border-white/10
              bg-card/80 px-4 py-3.5 text-left backdrop-blur-xl transition-all duration-200
              hover:border-primary/30 hover:bg-primary/5"
          >
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
              <s.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              {s.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
