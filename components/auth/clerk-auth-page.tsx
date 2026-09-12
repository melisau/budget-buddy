"use client";

import { SignIn, SignUp, useAuth } from "@clerk/react";
import { LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { setClerkSessionCookie } from "@/lib/auth/clerk-session-cookie";

export function ClerkAuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    void getToken().then((token) => {
      if (!token) return;
      setClerkSessionCookie(token);
      window.location.replace("/dashboard");
    });
  }, [getToken, isLoaded, isSignedIn]);

  if (!isLoaded || isSignedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="flex items-center gap-3 rounded-xl border bg-white px-5 py-4 text-sm shadow-sm">
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          <span>Oturum kontrol ediliyor…</span>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      {mode === "sign-in" ? (
        <SignIn fallbackRedirectUrl="/auth/complete" forceRedirectUrl="/auth/complete" />
      ) : (
        <SignUp fallbackRedirectUrl="/auth/complete" forceRedirectUrl="/auth/complete" />
      )}
    </main>
  );
}

export function ClerkSessionCompletePage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      window.location.replace("/sign-in");
      return;
    }

    void getToken().then((token) => {
      if (!token) return;
      setClerkSessionCookie(token);
      window.location.replace("/dashboard");
    });
  }, [getToken, isLoaded, isSignedIn]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="flex items-center gap-3 rounded-xl border bg-white px-5 py-4 text-sm shadow-sm">
        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
        <span>Giriş tamamlanıyor…</span>
      </div>
    </main>
  );
}
