import React from "react";
import { Code, Image, Sparkles, Zap } from "lucide-react";

const suggestions = [
  { icon: Zap, text: "Draft a launch plan for ai.xirako.com" },
  { icon: Image, text: "What can you help me understand from an uploaded image?" },
  { icon: Code, text: "Write a clean React component for a product card" },
];

export default function WelcomeScreen({ onSuggestion }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/25 bg-primary/15 shadow-2xl shadow-primary/10">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>

      <h2 className="mb-2 font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
        XirAI
      </h2>
      <p className="mb-10 max-w-md text-sm leading-relaxed text-muted-foreground">
        Your AI assistant by Xirako. Ask questions, upload images, or get help with code.
      </p>

      <div className="grid w-full max-w-lg gap-3">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.text}
            onClick={() => onSuggestion(suggestion.text)}
            className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-card/80 px-4 py-3.5 text-left backdrop-blur-xl transition-all duration-200 hover:border-primary/30 hover:bg-primary/5"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-primary/15">
              <suggestion.icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
            </div>
            <span className="text-sm text-muted-foreground transition-colors group-hover:text-foreground">
              {suggestion.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
