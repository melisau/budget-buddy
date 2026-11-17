"use client";

import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createNoncePair, googleIdentityClientId } from "@/lib/auth/google-identity";

const FAILED = "Google ile giriş tamamlanamadı. Lütfen tekrar deneyin.";

/** True inside the Capacitor iOS/Android app, where Google blocks web sign-in in the WebView. */
export function isNativeApp(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

let initialized: Promise<void> | null = null;
function init(webClientId: string) {
  initialized ??= SocialLogin.initialize({
    google: { webClientId, iOSClientId: process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || undefined, mode: "online" },
  });
  return initialized;
}

/** Native Google account picker; the ID token is exchanged with Supabase like the web GIS flow. */
export function NativeGoogleButton({ redirectTo, onError }: { redirectTo: string; onError: (message: string) => void }) {
  const [busy, setBusy] = useState(false);

  async function signIn() {
    const webClientId = googleIdentityClientId();
    if (!webClientId) { onError(FAILED); return; }
    setBusy(true);
    try {
      await init(webClientId);
      const { raw, hashed } = await createNoncePair();
      const { result } = await SocialLogin.login({ provider: "google", options: { nonce: hashed } });
      const token = "idToken" in result ? result.idToken : null;
      if (!token) throw new Error("no_id_token");
      const { error } = await getSupabaseBrowserClient().auth.signInWithIdToken({ provider: "google", token, nonce: raw });
      if (error) throw error;
      window.location.assign(redirectTo);
    } catch {
      onError(FAILED);
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="outline" className="h-12 w-full rounded-xl border-[#dfe3ed] bg-white text-sm font-semibold shadow-none" disabled={busy} aria-busy={busy} onClick={() => void signIn()}>
      {busy ? "Google'a bağlanılıyor…" : "Google ile devam et"}
    </Button>
  );
}
