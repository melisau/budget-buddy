"use client";

import { SignIn, SignUp, useAuth } from "@clerk/react";
import { LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { setClerkSessionCookie } from "@/lib/auth/clerk-session-cookie";

export function ClerkAuthPage({ mode, redirectTo = "/dashboard" }: { mode: "sign-in" | "sign-up"; redirectTo?: "/dashboard" | "/family" }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    void getToken().then((token) => {
      if (!token) return;
      setClerkSessionCookie(token);
      window.location.replace(redirectTo);
    });
  }, [getToken, isLoaded, isSignedIn, redirectTo]);

  const completeUrl = `/auth/complete?redirect=${encodeURIComponent(redirectTo)}`;
  const otherAuthUrl = `${mode === "sign-in" ? "/sign-up" : "/sign-in"}?redirect=${encodeURIComponent(redirectTo)}`;

  if (!isLoaded || isSignedIn) {
    return (
      <main id="main-content" tabIndex={-1} className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="flex items-center gap-3 rounded-xl border bg-white px-5 py-4 text-sm shadow-sm">
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          <span>Oturum kontrol ediliyor…</span>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-screen items-center justify-center px-4 py-8">
      {mode === "sign-in" ? (
        <SignIn
          signUpUrl={otherAuthUrl}
          fallbackRedirectUrl={completeUrl}
          forceRedirectUrl={completeUrl}
        />
      ) : (
        <SignUp
          signInUrl={otherAuthUrl}
          fallbackRedirectUrl={completeUrl}
          forceRedirectUrl={completeUrl}
        />
      )}
    </main>
  );
}

export function ClerkSessionCompletePage({ redirectTo = "/dashboard" }: { redirectTo?: "/dashboard" | "/family" }) {
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
      window.location.replace(redirectTo);
    });
  }, [getToken, isLoaded, isSignedIn, redirectTo]);

  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="flex items-center gap-3 rounded-xl border bg-white px-5 py-4 text-sm shadow-sm">
        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
        <span>Giriş tamamlanıyor…</span>
      </div>
    </main>
  );
}
