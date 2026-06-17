import React from "react";
import { ArrowDown, Code, Image, Zap } from "lucide-react";

const suggestions = [
  { icon: Zap, text: "Draft a launch plan for ai.xirako.com" },
  { icon: Image, text: "What can you help me understand from an uploaded image?" },
  { icon: Code, text: "Write a clean React component for a product card" },
];

const chips = ["Vision", "Code", "Planning", "Xirako Auth"];

export default function WelcomeScreen({ onSuggestion }) {
  return (
    <div className="relative flex flex-1 items-center overflow-hidden px-5 py-8 sm:px-10 lg:px-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_28%,rgba(22,161,103,0.25)_0%,transparent_35%),radial-gradient(circle_at_78%_30%,rgba(110,235,239,0.24)_0%,transparent_28%),radial-gradient(circle_at_86%_82%,rgba(0,245,228,0.26)_0%,transparent_30%)]" />

      <div className="relative z-10 grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,32rem)]">
        <div className="max-w-3xl">
          <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-white/12 bg-black/30 px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/72 backdrop-blur-xl">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Connected AI for the modern studio
          </div>

          <p className="font-heading text-[clamp(2.1rem,5vw,4.6rem)] font-medium leading-[1.04] text-white/92">
            Hey, this is
          </p>
          <h1 className="mt-1 font-heading text-[clamp(4.2rem,14vw,10.5rem)] font-semibold leading-[0.88] text-white">
            XirAI
          </h1>

          <p className="mt-7 max-w-2xl text-base leading-relaxed text-white/76">
            Xirako's assistant for fast answers, image understanding, code, and product thinking.
            Crafted to feel clear, cinematic, and ready to work.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white/66 backdrop-blur-xl"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-black/28 p-3 shadow-2xl shadow-black/35 backdrop-blur-2xl">
          <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Start here</p>
                <p className="mt-1 text-sm text-muted-foreground">Pick a prompt or type your own.</p>
              </div>
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="grid gap-3">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.text}
                  onClick={() => onSuggestion(suggestion.text)}
                  className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-card/70 px-4 py-3.5 text-left backdrop-blur-xl transition-all duration-200 hover:border-primary/35 hover:bg-primary/5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted transition-colors group-hover:bg-primary/15">
                    <suggestion.icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground transition-colors group-hover:text-foreground">
                    {suggestion.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
