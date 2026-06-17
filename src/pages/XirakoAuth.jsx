import React, { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { authClient } from "@/lib/authClient";
import { XIRAKO_LOGIN_URL } from "@/lib/xirakoAuth";

export default function XirakoAuth() {
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("xirako_access_token");
      const refreshToken = hash.get("xirako_refresh_token");

      if (!accessToken || !refreshToken) {
        setError("No authentication tokens found. Please try signing in again.");
        setStatus("error");
        return;
      }

      try {
        const { error: sessionError } = await authClient.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          throw sessionError;
        }

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname + window.location.search
        );

        window.location.assign("/");
      } catch (err) {
        setError(err?.message || "Failed to complete sign-in. Please try again.");
        setStatus("error");
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="texture-grain relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(41,245,189,0.22),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(116,245,255,0.2),transparent_32%),linear-gradient(180deg,rgba(1,4,5,0.1)_0%,rgba(2,9,10,0.76)_100%)]" />
      <div className="relative z-10 flex flex-col items-center gap-5 rounded-[1.75rem] border border-white/10 bg-black/35 px-8 py-9 text-center shadow-2xl shadow-black/40 backdrop-blur-2xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15">
          <Sparkles className={`h-7 w-7 text-primary ${status === "loading" ? "animate-pulse" : ""}`} />
        </div>

        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">XirAI</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            by Xirako
          </p>
        </div>

        {status === "loading" && (
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            <p className="text-sm text-muted-foreground">Signing you in...</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex max-w-sm flex-col items-center gap-4">
            <p className="text-sm text-destructive">{error}</p>
            <a
              href={XIRAKO_LOGIN_URL}
              className="rounded-full border border-primary/40 bg-primary/90 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground transition hover:brightness-110"
            >
              Try Again
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
