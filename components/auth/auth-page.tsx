"use client";

import Link from "next/link";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { authErrors, authMessages, type AuthMode } from "@/lib/auth/form";

export function AuthPage({ mode, redirectTo = "/dashboard", errorCode = "", status = "" }: { mode: AuthMode; redirectTo?: "/dashboard" | "/family"; errorCode?: string; status?: string }) {
  const [busy, setBusy] = useState(false);
  const message = typeof authMessages[status] === "string" ? authMessages[status] : "";
  const [googleError, setError] = useState("");
  const error = googleError || (typeof authErrors[errorCode] === "string" ? authErrors[errorCode] : "");
  const title = { "sign-in": "Giriş yap", "sign-up": "Hesap oluştur", "forgot-password": "Şifremi unuttum", "update-password": "Yeni şifre belirle" }[mode];

  async function google() {
    setBusy(true); setError("");
    try {
      const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}` } });
      if (error) throw error;
    } catch { setError("Google ile giriş başlatılamadı. Lütfen tekrar deneyin."); setBusy(false); }
  }

  return <main id="main-content" tabIndex={-1} className="flex min-h-screen items-center justify-center px-4 py-8">
    <section className="w-full max-w-md space-y-5 rounded-2xl border bg-white p-6 shadow-sm" aria-labelledby="auth-title">
      <Link href="/" className="font-semibold">BudgetBuddy</Link>
      <h1 id="auth-title" className="text-2xl font-semibold">{title}</h1>
      <form method="post" action="/auth/submit" onSubmit={() => setBusy(true)} className="space-y-4">
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="redirect" value={redirectTo} />
        {mode === "sign-up" && <label className="block">Ad soyad<Input name="name" autoComplete="name" maxLength={100} required /></label>}
        {mode !== "update-password" && <label className="block">E-posta<Input name="email" type="email" autoComplete="email" required /></label>}
        {mode !== "forgot-password" && <label className="block">Şifre<Input name="password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} minLength={mode === "sign-in" ? 1 : 8} maxLength={128} required /></label>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="text-sm text-green-700">{message}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Lütfen bekleyin…" : title}</Button>
      </form>
      {(mode === "sign-in" || mode === "sign-up") && <>
        {process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true" && <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => void google()}>Google ile devam et</Button>}
        <Link className="block text-sm underline" href={`${mode === "sign-in" ? "/sign-up" : "/sign-in"}?redirect=${encodeURIComponent(redirectTo)}`}>{mode === "sign-in" ? "Hesap oluştur" : "Zaten hesabım var"}</Link>
      </>}
      {mode === "sign-in" && <Link className="block text-sm underline" href="/forgot-password">Şifremi unuttum</Link>}
      {mode === "forgot-password" && <Link className="block text-sm underline" href="/sign-in">Girişe dön</Link>}
    </section>
  </main>;
}
