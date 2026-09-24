"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authErrors, authMessages, type AuthMode } from "@/lib/auth/form";

const copy: Record<AuthMode, { eyebrow: string; title: string; description: string; button: string }> = {
  "sign-in": { eyebrow: "YENİDEN HOŞ GELDİN", title: "Finansal yolculuğuna devam et.", description: "Bütçen, hedeflerin ve tüm hesapların seni bekliyor.", button: "Giriş yap" },
  "sign-up": { eyebrow: "BİRLİKTE BAŞLAYALIM", title: "Paranı güvenle yönetmeye başla.", description: "Birkaç adımda hesabını oluştur, finansal geleceğini planla.", button: "Ücretsiz hesap oluştur" },
  "forgot-password": { eyebrow: "HESAP KURTARMA", title: "Şifreni sıfırlayalım.", description: "E-posta adresini yaz; sana güvenli bir sıfırlama bağlantısı gönderelim.", button: "Sıfırlama bağlantısı gönder" },
  "update-password": { eyebrow: "YENİ BİR BAŞLANGIÇ", title: "Yeni şifreni belirle.", description: "Hesabını korumak için en az 8 karakterlik güçlü bir şifre seç.", button: "Şifreyi güncelle" },
};

export function AuthPage({ mode, redirectTo = "/dashboard", errorCode = "", status = "" }: { mode: AuthMode; redirectTo?: "/dashboard" | "/family"; errorCode?: string; status?: string }) {
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleError, setError] = useState("");
  const message = typeof authMessages[status] === "string" ? authMessages[status] : "";
  const error = googleError || (typeof authErrors[errorCode] === "string" ? authErrors[errorCode] : "");
  const content = copy[mode];

  async function google() {
    setBusy(true);
    setError("");
    try {
      const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}` } });
      if (error) throw error;
    } catch {
      setError("Google ile giriş başlatılamadı. Lütfen tekrar deneyin.");
      setBusy(false);
    }
  }

  return (
    <main id="main-content" tabIndex={-1} className="grid min-h-screen bg-[#f7f8fc] text-[#17213c] lg:grid-cols-[minmax(0,1fr)_minmax(560px,0.95fr)]">
      <aside className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#172340] p-10 text-white lg:flex xl:p-16" aria-label="BudgetBuddy hakkında">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-28 h-[430px] w-[430px] rounded-full bg-[#5267df]/30 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-36 h-[460px] w-[460px] rounded-full bg-[#344d99]/50 blur-3xl" />
        <Link href="/" className="relative flex w-fit items-center gap-3 text-xl font-extrabold tracking-tight text-white">
          <span className="grid size-11 place-items-center rounded-2xl bg-[#5267df] shadow-lg shadow-black/20"><WalletCards className="size-6" aria-hidden="true" /></span>
          Budget<span className="-ml-3 text-[#aab8ff]">Buddy</span>
        </Link>

        <div className="relative max-w-xl py-14">
          <span className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold tracking-wide text-[#dbe2ff]"><Sparkles className="size-4 text-[#b7c3ff]" aria-hidden="true" /> Finansal netlik burada başlar</span>
          <h2 className="max-w-lg text-5xl font-bold leading-[1.08] tracking-[-0.055em] xl:text-6xl">Paranın kontrolü, <span className="text-[#aab8ff]">senin elinde.</span></h2>
          <p className="mt-6 max-w-md text-base leading-7 text-[#c4cada]">Harcamalarını tek yerde gör, bütçeni kolayca planla ve hedeflerine güvenle ilerle.</p>
          <div className="mt-10 max-w-md rounded-[26px] border border-white/15 bg-white/10 p-5 shadow-2xl shadow-black/15 backdrop-blur-md">
            <div className="mb-5 flex items-center justify-between"><span className="text-sm font-medium text-[#d2daee]">Finansal görünüm</span><span className="rounded-full bg-[#aab8ff]/20 px-3 py-1 text-xs font-semibold text-[#d5ddff]">Bu ay</span></div>
            <div className="grid grid-cols-7 items-end gap-2" aria-hidden="true">{[42, 65, 50, 78, 58, 87, 71].map((height, index) => <span key={index} className="rounded-t-md bg-gradient-to-t from-[#6277df] to-[#bbc6ff]" style={{ height: `${height}px` }} />)}</div>
            <div className="mt-5 flex items-center gap-2 border-t border-white/15 pt-4 text-sm text-[#e3e8fa]"><span className="grid size-7 place-items-center rounded-full bg-emerald-400/20 text-emerald-200"><Check className="size-4" aria-hidden="true" /></span> Hedeflerine bir adım daha yakınsın</div>
          </div>
        </div>

        <p className="relative flex items-center gap-2 text-sm text-[#aebad4]"><ShieldCheck className="size-4" aria-hidden="true" /> Verilerin güvende, kararların sana ait.</p>
      </aside>

      <section className="flex min-h-screen flex-col px-5 py-7 sm:px-10 sm:py-9 lg:px-12 xl:px-20" aria-labelledby="auth-title">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-[#17213c] lg:hidden"><span className="grid size-9 place-items-center rounded-xl bg-[#5267df] text-white"><WalletCards className="size-5" aria-hidden="true" /></span>Budget<span className="-ml-2 text-[#5267df]">Buddy</span></Link>
          <Link href="/" className="ml-auto text-sm font-semibold text-[#68738b] transition-colors hover:text-[#4258d5]">Ana sayfaya dön <span aria-hidden="true">↗</span></Link>
        </div>

        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-12 sm:py-16">
          <div className="mb-8"><span className="text-xs font-extrabold tracking-[0.16em] text-[#5267df]">{content.eyebrow}</span><h1 id="auth-title" className="mt-4 text-3xl font-bold leading-tight tracking-[-0.045em] sm:text-[2.45rem]">{content.title}</h1><p className="mt-3 text-[15px] leading-7 text-[#69738c]">{content.description}</p></div>

          <form method="post" action="/auth/submit" onSubmit={() => setBusy(true)} className="space-y-5">
            <input type="hidden" name="mode" value={mode} />
            <input type="hidden" name="redirect" value={redirectTo} />
            {mode === "sign-up" && <label className="block text-sm font-semibold text-[#34415f]">Ad soyad<Input name="name" autoComplete="name" maxLength={100} placeholder="Adınız ve soyadınız" className="mt-2 h-12 rounded-xl bg-white px-4 text-sm shadow-none" required /></label>}
            {mode !== "update-password" && <div><label htmlFor="auth-email" className="text-sm font-semibold text-[#34415f]">E-posta adresi</label><div className="relative mt-2"><Mail className="pointer-events-none absolute left-4 top-3.5 size-5 text-[#9aa4b8]" aria-hidden="true" /><Input id="auth-email" name="email" type="email" autoComplete="email" placeholder="ornek@eposta.com" className="h-12 rounded-xl bg-white pl-12 pr-4 text-sm shadow-none" required /></div></div>}
            {mode !== "forgot-password" && <div><div className="flex items-center justify-between gap-3"><label htmlFor="auth-password" className="text-sm font-semibold text-[#34415f]">{mode === "update-password" ? "Yeni şifre" : "Şifre"}</label>{mode === "sign-in" && <Link href="/forgot-password" className="text-sm font-semibold text-[#5267df] hover:underline">Şifremi unuttum</Link>}</div><div className="relative mt-2"><LockKeyhole className="pointer-events-none absolute left-4 top-3.5 size-5 text-[#9aa4b8]" aria-hidden="true" /><Input id="auth-password" name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "sign-in" ? "current-password" : "new-password"} minLength={mode === "sign-in" ? 1 : 8} maxLength={128} placeholder={mode === "sign-in" ? "Şifrenizi girin" : "En az 8 karakter"} className="h-12 rounded-xl bg-white pl-12 pr-12 text-sm shadow-none" required /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-2.5 grid size-7 place-items-center rounded-md text-[#8993a8] hover:text-[#4258d5]" aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}>{showPassword ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}</button></div></div>}
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
            <Button type="submit" className="h-12 w-full rounded-xl bg-[#4258d5] text-sm font-bold shadow-lg shadow-[#4258d5]/20 hover:bg-[#3549bd]" disabled={busy}>{busy ? "Lütfen bekleyin…" : <>{content.button}<ArrowRight className="ml-1 size-4" aria-hidden="true" /></>}</Button>
          </form>

          {(mode === "sign-in" || mode === "sign-up") && <>
            {process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true" && <><div className="my-6 flex items-center gap-4 text-xs font-semibold text-[#99a2b3]"><span className="h-px flex-1 bg-[#e1e5ee]" />VEYA<span className="h-px flex-1 bg-[#e1e5ee]" /></div><Button type="button" variant="outline" className="h-12 w-full rounded-xl border-[#dfe3ed] bg-white text-sm font-semibold shadow-none" disabled={busy} onClick={() => void google()}>Google ile devam et</Button></>}
            <p className="mt-8 text-center text-sm text-[#69738c]">{mode === "sign-in" ? "Henüz hesabın yok mu?" : "Zaten bir hesabın var mı?"} <Link className="font-bold text-[#4258d5] hover:underline" href={`${mode === "sign-in" ? "/sign-up" : "/sign-in"}?redirect=${encodeURIComponent(redirectTo)}`}>{mode === "sign-in" ? "Hesap oluştur" : "Giriş yap"}</Link></p>
          </>}
          {mode === "forgot-password" && <Link className="mt-7 text-center text-sm font-semibold text-[#4258d5] hover:underline" href="/sign-in">← Giriş ekranına dön</Link>}
        </div>
        <p className="text-center text-xs leading-5 text-[#9aa3b5]">Güvenli ve sade bir finans deneyimi. <Link href="/privacy" className="underline underline-offset-2 hover:text-[#4258d5]">Gizlilik politikası</Link></p>
      </section>
    </main>
  );
}
