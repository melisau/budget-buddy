"use client";

import { useContext, useState, type FormEvent } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { LanguageContext } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { localized } from "@/lib/i18n/localized";

/** Second sign-in step: asks for the authenticator code and upgrades the session. */
export function TwoStepChallenge({ redirectTo }: { redirectTo: string }) {
  const { language } = useContext(LanguageContext);
  const tr = language === "tr";
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) { setError(tr ? "6 haneli kodu girin." : localized("Enter the 6-digit code.")); return; }
    setBusy(true);
    setError("");
    try {
      const auth = getSupabaseBrowserClient().auth;
      const factors = await auth.mfa.listFactors();
      if (factors.error) throw factors.error;
      const factor = factors.data.totp[0];
      // No verified factor any more (turned off elsewhere): the server decides.
      if (!factor) { window.location.assign(redirectTo); return; }
      const { error: verifyError } = await auth.mfa.challengeAndVerify({ factorId: factor.id, code });
      if (verifyError) throw verifyError;
      window.location.assign(redirectTo);
    } catch (caught) {
      const errorCode = caught && typeof caught === "object" && "code" in caught ? String(caught.code) : "";
      setError(errorCode === "mfa_verification_failed" || errorCode === "mfa_challenge_expired"
        ? (tr ? "Kod hatalı veya süresi dolmuş. Uygulamadaki güncel kodu girin." : localized("The code is wrong or expired. Enter the current code from your app."))
        : errorCode === "over_request_rate_limit"
          ? (tr ? "Çok fazla deneme yapıldı. Bir süre bekleyip tekrar deneyin." : localized("Too many attempts. Wait a while and try again."))
          : (tr ? "Doğrulama tamamlanamadı. Bağlantınızı kontrol edip tekrar deneyin." : localized("Verification could not be completed. Check your connection and try again.")));
      setCode("");
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try { await getSupabaseBrowserClient().auth.signOut({ scope: "local" }); } catch { /* leave anyway */ }
    window.location.replace("/sign-in");
  }

  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-screen flex-col bg-[var(--c-s-f7f8fc)] px-5 py-7 text-[var(--c-t-17213c)] sm:px-10 sm:py-9">
      <span className="flex items-center gap-2 text-lg font-extrabold tracking-tight"><BrandMark size={36} />Budget<span className="-ml-2 text-[var(--c-t-5267df)]">Buddy</span></span>
      <section className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-12" aria-labelledby="two-step-title">
        <span className="flex items-center gap-2 text-xs font-extrabold tracking-[0.16em] text-[var(--c-t-5267df)]"><ShieldCheck className="size-4" aria-hidden="true" />{tr ? "İKİ ADIMLI DOĞRULAMA" : localized("TWO-STEP VERIFICATION")}</span>
        <h1 id="two-step-title" className="mt-4 text-3xl font-bold leading-tight tracking-[-0.045em]">{tr ? "Doğrulama kodunu gir." : localized("Enter your verification code.")}</h1>
        <p className="mt-3 text-[15px] leading-7 text-[var(--c-t-69738c)]">{tr ? "Kimlik doğrulama uygulamandaki 6 haneli BudgetBuddy kodunu yaz." : localized("Type the 6-digit BudgetBuddy code from your authenticator app.")}</p>
        <form onSubmit={(event) => void submit(event)} className="mt-8 space-y-5" noValidate>
          <label className="block text-sm font-semibold text-[var(--c-t-34415f)]">{tr ? "Doğrulama kodu" : localized("Verification code")}
            <Input name="code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} placeholder="000000" autoFocus required aria-invalid={Boolean(error)} aria-describedby={error ? "two-step-error" : undefined} className="mt-2 h-12 rounded-xl bg-[var(--c-s-ffffff)] px-4 text-center text-lg tracking-[0.4em] shadow-none" />
          </label>
          {error && <p id="two-step-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <Button type="submit" className="h-12 w-full rounded-xl bg-[var(--c-s-4258d5)] text-sm font-bold shadow-lg shadow-[var(--c-s-4258d5)]/20 hover:bg-[var(--c-s-3549bd)]" disabled={busy}>{busy ? (tr ? "Lütfen bekleyin…" : localized("Please wait…")) : <>{tr ? "Doğrula" : localized("Verify")}<ArrowRight className="ml-1 size-4" aria-hidden="true" /></>}</Button>
        </form>
        <p className="mt-6 text-sm leading-6 text-[var(--c-t-69738c)]">{tr ? "Telefonuna erişemiyor musun? Hesabının e-posta adresinden bize yaz: " : localized("Lost access to your phone? Write to us from your account's email address: ")}<a className="font-semibold text-[var(--c-t-4258d5)] underline underline-offset-2" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a></p>
        <button type="button" className="mt-6 w-fit text-sm font-semibold text-[var(--c-t-4258d5)] hover:underline" disabled={busy} onClick={() => void signOut()}>{tr ? "← Farklı bir hesapla giriş yap" : localized("← Sign in with a different account")}</button>
      </section>
    </main>
  );
}
