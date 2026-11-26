"use client";

import Link from "next/link";
import { useContext, useState } from "react";
import { LanguageContext } from "@/components/providers/language-provider";
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authErrors, authMessages, type AuthMode } from "@/lib/auth/form";
import { authText } from "@/lib/auth/form-messages";
import { GoogleIdentityButton } from "@/components/auth/google-identity-button";
import { landingPath } from "@/lib/seo/i18n";
import type { Language } from "@/lib/i18n/localized";

type Copy = { eyebrow: string; title: string; description: string; button: string };

/** Heading texts per page, in Turkish, English and German. */
const copy: Record<AuthMode, Record<Language, Copy>> = {
  "sign-in": {
    tr: { eyebrow: "YENİDEN HOŞ GELDİN", title: "Finansal yolculuğuna devam et.", description: "Bütçen, hedeflerin ve tüm hesapların seni bekliyor.", button: "Giriş yap" },
    en: { eyebrow: "WELCOME BACK", title: "Continue your financial journey.", description: "Your budgets, goals and accounts are waiting for you.", button: "Sign in" },
    de: { eyebrow: "WILLKOMMEN ZURÜCK", title: "Setze deine Finanzreise fort.", description: "Deine Budgets, Ziele und Konten warten auf dich.", button: "Anmelden" },
  },
  "sign-up": {
    tr: { eyebrow: "BİRLİKTE BAŞLAYALIM", title: "Paranı güvenle yönetmeye başla.", description: "Birkaç adımda hesabını oluştur, finansal geleceğini planla.", button: "Ücretsiz hesap oluştur" },
    en: { eyebrow: "LET'S START TOGETHER", title: "Start managing your money with confidence.", description: "Create your account in a few steps and plan your financial future.", button: "Create a free account" },
    de: { eyebrow: "LASS UNS STARTEN", title: "Verwalte dein Geld mit Zuversicht.", description: "Erstelle dein Konto in wenigen Schritten und plane deine finanzielle Zukunft.", button: "Kostenloses Konto erstellen" },
  },
  "forgot-password": {
    tr: { eyebrow: "HESAP KURTARMA", title: "Şifreni sıfırlayalım.", description: "E-posta adresini yaz; sana güvenli bir sıfırlama bağlantısı gönderelim.", button: "Sıfırlama bağlantısı gönder" },
    en: { eyebrow: "ACCOUNT RECOVERY", title: "Let's reset your password.", description: "Enter your e-mail address and we will send you a secure reset link.", button: "Send reset link" },
    de: { eyebrow: "KONTO WIEDERHERSTELLEN", title: "Setzen wir dein Passwort zurück.", description: "Gib deine E-Mail-Adresse ein; wir senden dir einen sicheren Link zum Zurücksetzen.", button: "Link zum Zurücksetzen senden" },
  },
  "update-password": {
    tr: { eyebrow: "YENİ BİR BAŞLANGIÇ", title: "Yeni şifreni belirle.", description: "Hesabını korumak için en az 8 karakterlik güçlü bir şifre seç.", button: "Şifreyi güncelle" },
    en: { eyebrow: "A FRESH START", title: "Set your new password.", description: "Choose a strong password of at least 8 characters to protect your account.", button: "Update password" },
    de: { eyebrow: "EIN NEUER ANFANG", title: "Lege dein neues Passwort fest.", description: "Wähle ein sicheres Passwort mit mindestens 8 Zeichen, um dein Konto zu schützen.", button: "Passwort aktualisieren" },
  },
};

export function AuthPage({ mode, redirectTo = "/dashboard", errorCode = "", status = "" }: { mode: AuthMode; redirectTo?: "/dashboard" | "/family"; errorCode?: string; status?: string }) {
  const [busy, setBusy] = useState(false);
  const { language } = useContext(LanguageContext);
  /** Picks the text for the reader's language. */
  const L = (tr: string, en: string, de: string) => (language === "tr" ? tr : language === "de" ? de : en);
  const [showPassword, setShowPassword] = useState(false);
  const [googleError, setError] = useState("");
  const [gisUnavailable, setGisUnavailable] = useState(false);
  const message = authText("message", status, language, authMessages);
  const error = googleError || authText("error", errorCode, language, authErrors);
  const content = copy[mode][language];
  const home = landingPath(language);
  const linkClass = "font-semibold text-[var(--c-t-4258d5)] underline underline-offset-2";

  async function google() {
    setBusy(true);
    setError("");
    try {
      const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}` } });
      if (error) throw error;
    } catch {
      setError(L("Google ile giriş başlatılamadı. Lütfen tekrar deneyin.", "Google sign-in could not start. Please try again.", "Die Anmeldung mit Google konnte nicht gestartet werden. Bitte versuche es erneut."));
      setBusy(false);
    }
  }

  return (
    <main id="main-content" tabIndex={-1} className="grid min-h-screen bg-[var(--c-s-f7f8fc)] text-[var(--c-t-17213c)] lg:grid-cols-[minmax(0,1fr)_minmax(560px,0.95fr)]">
      <aside className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[var(--c-s-172340)] p-10 text-white lg:flex xl:p-16" aria-label={L("BudgetBuddy hakkında", "About BudgetBuddy", "Über BudgetBuddy")}>
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-28 h-[430px] w-[430px] rounded-full bg-[var(--c-s-5267df)]/30 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-36 h-[460px] w-[460px] rounded-full bg-[var(--c-s-344d99)]/50 blur-3xl" />
        <Link href={home} className="relative flex w-fit items-center gap-3 text-xl font-extrabold tracking-tight text-white">
          <BrandMark size={44} className="shadow-lg shadow-black/20 rounded-[10px]" />
          Budget<span className="-ml-3 text-[var(--c-t-aab8ff)]">Buddy</span>
        </Link>

        <div className="relative max-w-xl py-14">
          <span className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-[var(--c-s-ffffff)]/10 px-4 py-2 text-xs font-semibold tracking-wide text-[var(--c-t-dbe2ff)]"><Sparkles className="size-4 text-[var(--c-t-b7c3ff)]" aria-hidden="true" /> {L("Finansal netlik burada başlar", "Financial clarity starts here", "Finanzielle Klarheit beginnt hier")}</span>
          <h2 className="max-w-lg text-5xl font-bold leading-[1.08] tracking-[-0.055em] xl:text-6xl">{L("Paranın kontrolü, ", "Your money, ", "Dein Geld, ")}<span className="text-[var(--c-t-aab8ff)]">{L("senin elinde.", "in your hands.", "in deiner Hand.")}</span></h2>
          <p className="mt-6 max-w-md text-base leading-7 text-[var(--c-t-c4cada)]">{L("Harcamalarını tek yerde gör, bütçeni kolayca planla ve hedeflerine güvenle ilerle.", "See your spending in one place, plan your budget with ease and move toward your goals with confidence.", "Sieh deine Ausgaben an einem Ort, plane dein Budget ganz einfach und erreiche deine Ziele mit Zuversicht.")}</p>
          <div className="mt-10 max-w-md rounded-[26px] border border-white/15 bg-[var(--c-s-ffffff)]/10 p-5 shadow-2xl shadow-black/15 backdrop-blur-md">
            <div className="mb-5 flex items-center justify-between"><span className="text-sm font-medium text-[var(--c-t-d2daee)]">{L("Finansal görünüm", "Financial overview", "Finanzübersicht")}</span><span className="rounded-full bg-[var(--c-s-aab8ff)]/20 px-3 py-1 text-xs font-semibold text-[var(--c-t-d5ddff)]">{L("Bu ay", "This month", "Dieser Monat")}</span></div>
            <div className="grid grid-cols-7 items-end gap-2" aria-hidden="true">{[42, 65, 50, 78, 58, 87, 71].map((height, index) => <span key={index} className="rounded-t-md bg-gradient-to-t from-[var(--c-s-6277df)] to-[var(--c-s-bbc6ff)]" style={{ height: `${height}px` }} />)}</div>
            <div className="mt-5 flex items-center gap-2 border-t border-white/15 pt-4 text-sm text-[var(--c-t-e3e8fa)]"><span className="grid size-7 place-items-center rounded-full bg-emerald-400/20 text-emerald-200"><Check className="size-4" aria-hidden="true" /></span> {L("Hedeflerine bir adım daha yakınsın", "One step closer to your goals", "Deinen Zielen einen Schritt näher")}</div>
          </div>
        </div>

        <p className="relative flex items-center gap-2 text-sm text-[var(--c-t-aebad4)]"><ShieldCheck className="size-4" aria-hidden="true" /> {L("Verilerin güvende, kararların sana ait.", "Your data is safe, your decisions are yours.", "Deine Daten sind sicher, deine Entscheidungen gehören dir.")}</p>
      </aside>

      <section className="flex min-h-screen flex-col px-5 py-7 sm:px-10 sm:py-9 lg:px-12 xl:px-20" aria-labelledby="auth-title">
        <div className="flex items-center justify-between gap-4">
          <Link href={home} className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-[var(--c-t-17213c)] lg:hidden"><BrandMark size={36} />Budget<span className="-ml-2 text-[var(--c-t-5267df)]">Buddy</span></Link>
          <Link href={home} className="ml-auto text-sm font-semibold text-[var(--c-t-68738b)] transition-colors hover:text-[var(--c-t-4258d5)]">{L("Ana sayfaya dön", "Back to home", "Zur Startseite")} <span aria-hidden="true">↗</span></Link>
        </div>

        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-12 sm:py-16">
          <div className="mb-8"><span className="text-xs font-extrabold tracking-[0.16em] text-[var(--c-t-5267df)]">{content.eyebrow}</span><h1 id="auth-title" className="mt-4 text-3xl font-bold leading-tight tracking-[-0.045em] sm:text-[2.45rem]">{content.title}</h1><p className="mt-3 text-[15px] leading-7 text-[var(--c-t-69738c)]">{content.description}</p></div>

          <form method="post" action="/auth/submit" onSubmit={() => setBusy(true)} className="space-y-5">
            <input type="hidden" name="mode" value={mode} />
            <input type="hidden" name="redirect" value={redirectTo} />
            <input type="hidden" name="language" value={language} />
            {mode === "sign-up" && <label className="block text-sm font-semibold text-[var(--c-t-34415f)]">{L("Ad soyad", "Full name", "Vor- und Nachname")}<Input name="name" autoComplete="name" maxLength={100} placeholder={L("Adınız ve soyadınız", "Your first and last name", "Dein Vor- und Nachname")} className="mt-2 h-12 rounded-xl bg-[var(--c-s-ffffff)] px-4 text-sm shadow-none" required /></label>}
            {mode !== "update-password" && <div><label htmlFor="auth-email" className="text-sm font-semibold text-[var(--c-t-34415f)]">{L("E-posta adresi", "E-mail address", "E-Mail-Adresse")}</label><div className="relative mt-2"><Mail className="pointer-events-none absolute left-4 top-3.5 size-5 text-[var(--c-t-9aa4b8)]" aria-hidden="true" /><Input id="auth-email" name="email" type="email" autoComplete="email" placeholder={L("ornek@eposta.com", "name@example.com", "name@beispiel.de")} className="h-12 rounded-xl bg-[var(--c-s-ffffff)] pl-12 pr-4 text-sm shadow-none" required /></div></div>}
            {mode !== "forgot-password" && <div><div className="flex items-center justify-between gap-3"><label htmlFor="auth-password" className="text-sm font-semibold text-[var(--c-t-34415f)]">{mode === "update-password" ? L("Yeni şifre", "New password", "Neues Passwort") : L("Şifre", "Password", "Passwort")}</label>{mode === "sign-in" && <Link href="/forgot-password" className="text-sm font-semibold text-[var(--c-t-5267df)] hover:underline">{L("Şifremi unuttum", "Forgot password", "Passwort vergessen")}</Link>}</div><div className="relative mt-2"><LockKeyhole className="pointer-events-none absolute left-4 top-3.5 size-5 text-[var(--c-t-9aa4b8)]" aria-hidden="true" /><Input id="auth-password" name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "sign-in" ? "current-password" : "new-password"} minLength={mode === "sign-in" ? 1 : 8} maxLength={128} placeholder={mode === "sign-in" ? L("Şifrenizi girin", "Enter your password", "Passwort eingeben") : L("En az 8 karakter", "At least 8 characters", "Mindestens 8 Zeichen")} className="h-12 rounded-xl bg-[var(--c-s-ffffff)] pl-12 pr-12 text-sm shadow-none" required /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-2.5 grid size-7 place-items-center rounded-md text-[var(--c-t-8993a8)] hover:text-[var(--c-t-4258d5)]" aria-label={showPassword ? L("Şifreyi gizle", "Hide password", "Passwort ausblenden") : L("Şifreyi göster", "Show password", "Passwort anzeigen")}>{showPassword ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}</button></div></div>}
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            {mode === "sign-up" && <p className="text-xs leading-5 text-[var(--c-t-69738c)]">{language === "tr"
              ? <>Hesap oluşturarak <Link href="/terms" className={linkClass}>Kullanım Koşulları</Link>&apos;nı kabul etmiş ve kişisel verilerinin <Link href="/privacy" className={linkClass}>Gizlilik Politikası ve KVKK Aydınlatma Metni</Link>&apos;nde açıklandığı şekilde işleneceğini öğrenmiş olursun.</>
              : language === "de"
                ? <>Mit dem Erstellen eines Kontos akzeptierst du die <Link href="/terms" className={linkClass}>Nutzungsbedingungen</Link> und nimmst zur Kenntnis, dass deine personenbezogenen Daten wie in der <Link href="/privacy" className={linkClass}>Datenschutzerklärung</Link> beschrieben verarbeitet werden.</>
                : <>By creating an account you accept the <Link href="/terms" className={linkClass}>Terms of Use</Link> and acknowledge that your personal data is processed as described in the <Link href="/privacy" className={linkClass}>Privacy Policy</Link>.</>}</p>}
            {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
            <Button type="submit" className="h-12 w-full rounded-xl bg-[var(--c-s-4258d5)] text-sm font-bold shadow-lg shadow-[var(--c-s-4258d5)]/20 hover:bg-[var(--c-s-3549bd)]" disabled={busy}>{busy ? L("Lütfen bekleyin…", "Please wait…", "Bitte warten…") : <>{content.button}<ArrowRight className="ml-1 size-4" aria-hidden="true" /></>}</Button>
          </form>

          {(mode === "sign-in" || mode === "sign-up") && <>
            {process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true" && <><div className="my-6 flex items-center gap-4 text-xs font-semibold text-[var(--c-t-99a2b3)]"><span className="h-px flex-1 bg-[var(--c-s-e1e5ee)]" />{L("VEYA", "OR", "ODER")}<span className="h-px flex-1 bg-[var(--c-s-e1e5ee)]" /></div><>{!gisUnavailable && <GoogleIdentityButton redirectTo={redirectTo} mode={mode} onUnavailable={() => setGisUnavailable(true)} onError={setError} />}{gisUnavailable ? <Button type="button" variant="outline" className="h-12 w-full rounded-xl border-[var(--c-s-dfe3ed)] bg-[var(--c-s-ffffff)] text-sm font-semibold shadow-none" disabled={busy} onClick={() => void google()}>{L("Google ile devam et", "Continue with Google", "Mit Google fortfahren")}</Button> : <button type="button" className="mt-3 w-full text-center text-xs font-semibold text-[var(--c-t-69738c)] hover:text-[var(--c-t-4258d5)] hover:underline" disabled={busy} onClick={() => void google()}>{L("Google penceresi açılmıyor mu? Yönlendirerek devam et", "Google window not opening? Continue with a redirect", "Öffnet sich das Google-Fenster nicht? Per Weiterleitung fortfahren")}</button>}</></>}
            <p className="mt-8 text-center text-sm text-[var(--c-t-69738c)]">{mode === "sign-in" ? L("Henüz hesabın yok mu?", "Don't have an account yet?", "Noch kein Konto?") : L("Zaten bir hesabın var mı?", "Already have an account?", "Schon ein Konto?")} <Link className="font-bold text-[var(--c-t-4258d5)] hover:underline" href={`${mode === "sign-in" ? "/sign-up" : "/sign-in"}?redirect=${encodeURIComponent(redirectTo)}`}>{mode === "sign-in" ? L("Hesap oluştur", "Create account", "Konto erstellen") : L("Giriş yap", "Sign in", "Anmelden")}</Link></p>
          </>}
          {mode === "forgot-password" && <Link className="mt-7 text-center text-sm font-semibold text-[var(--c-t-4258d5)] hover:underline" href="/sign-in">{L("← Giriş ekranına dön", "← Back to sign in", "← Zurück zur Anmeldung")}</Link>}
        </div>
        <p className="text-center text-xs leading-5 text-[var(--c-t-9aa3b5)]">{L("Güvenli ve sade bir finans deneyimi.", "A safe and simple finance experience.", "Ein sicheres und einfaches Finanzerlebnis.")} <Link href="/privacy" className="underline underline-offset-2 hover:text-[var(--c-t-4258d5)]">{L("Gizlilik politikası", "Privacy policy", "Datenschutz")}</Link></p>
      </section>
    </main>
  );
}
