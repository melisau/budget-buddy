"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createNoncePair, googleIdentityClientId, isTrustedWebActivity } from "@/lib/auth/google-identity";

type GoogleId = {
  initialize(options: Record<string, unknown>): void;
  renderButton(element: HTMLElement, options: Record<string, unknown>): void;
};
declare global {
  interface Window { google?: { accounts: { id: GoogleId } } }
}

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const FAILED = "Google ile giriş tamamlanamadı. Lütfen tekrar deneyin.";

function loadScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? Object.assign(document.createElement("script"), { src: SCRIPT_SRC, async: true, defer: true });
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("gsi_load_failed")), { once: true });
    if (!existing) document.head.appendChild(script);
  });
}

/**
 * Renders Google's own button on our domain. Calls onUnavailable when GIS cannot be used
 * (no client ID, Android TWA, script blocked) so the caller shows the redirect fallback.
 */
export function GoogleIdentityButton({ redirectTo, mode, onUnavailable, onError }: {
  redirectTo: string;
  mode: "sign-in" | "sign-up";
  onUnavailable: () => void;
  onError: (message: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const callbacks = useRef({ onUnavailable, onError });
  useEffect(() => { callbacks.current = { onUnavailable, onError }; });

  useEffect(() => {
    const clientId = googleIdentityClientId();
    if (!clientId || isTrustedWebActivity(document.referrer)) { callbacks.current.onUnavailable(); return; }
    let cancelled = false;
    (async () => {
      try {
        const [{ raw, hashed }] = await Promise.all([createNoncePair(), loadScript()]);
        const id = window.google?.accounts?.id;
        if (cancelled) return;
        if (!id || !container.current) { callbacks.current.onUnavailable(); return; }
        id.initialize({
          client_id: clientId,
          nonce: hashed,
          callback: async ({ credential }: { credential?: string }) => {
            if (!credential) { callbacks.current.onError(FAILED); return; }
            const { error } = await getSupabaseBrowserClient().auth.signInWithIdToken({ provider: "google", token: credential, nonce: raw });
            if (error) { callbacks.current.onError(FAILED); return; }
            window.location.assign(redirectTo);
          },
        });
        id.renderButton(container.current, {
          type: "standard", theme: "outline", size: "large", shape: "rectangular",
          text: mode === "sign-up" ? "signup_with" : "continue_with", locale: "tr",
          width: Math.min(container.current.offsetWidth || 400, 400),
        });
        setReady(true);
      } catch {
        if (!cancelled) callbacks.current.onUnavailable();
      }
    })();
    return () => { cancelled = true; };
  }, [redirectTo, mode]);

  return <div ref={container} className="flex min-h-[44px] w-full justify-center" aria-busy={!ready} />;
}
