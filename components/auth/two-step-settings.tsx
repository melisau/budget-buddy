"use client";

import { useCallback, useContext, useEffect, useState, type FormEvent } from "react";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { LanguageContext } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { localized } from "@/lib/i18n/localized";

type Status = "loading" | "error" | "off" | "on";
type Enrollment = { factorId: string; qrCode: string; secret: string };

const errorCodeOf = (error: unknown) => error && typeof error === "object" && "code" in error ? String(error.code) : "";

/** Settings row and dialog that turn authenticator-app two-step verification on or off. */
export function TwoStepSettings() {
  const { language } = useContext(LanguageContext);
  const tr = language === "tr";
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmingOff, setConfirmingOff] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const { data, error: listError } = await getSupabaseBrowserClient().auth.mfa.listFactors();
      if (listError) throw listError;
      const verified = data.totp[0];
      setFactorId(verified?.id ?? null);
      setStatus(verified ? "on" : "off");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => { const timeout = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timeout); }, [load]);

  const failure = (caught: unknown) => {
    const errorCode = errorCodeOf(caught);
    setError(errorCode === "mfa_verification_failed" || errorCode === "mfa_challenge_expired"
      ? (tr ? "Kod hatalı veya süresi dolmuş. Uygulamadaki güncel kodu girin." : localized("The code is wrong or expired. Enter the current code from your app."))
      : errorCode === "insufficient_aal"
        ? (tr ? "Bu işlem için çıkış yapıp doğrulama koduyla yeniden giriş yapın." : localized("Sign out and sign in again with your verification code to do this."))
        : errorCode === "mfa_totp_enroll_not_enabled" || errorCode === "mfa_totp_verify_not_enabled"
          ? (tr ? "İki adımlı doğrulama şu anda kullanılamıyor." : localized("Two-step verification is not available right now."))
          : (tr ? "İşlem tamamlanamadı. Tekrar deneyin." : localized("Something went wrong. Try again.")));
  };

  async function start() {
    setBusy(true);
    setError("");
    try {
      const mfa = getSupabaseBrowserClient().auth.mfa;
      // An abandoned earlier attempt leaves an unverified factor behind; remove it first.
      const existing = await mfa.listFactors();
      if (existing.error) throw existing.error;
      for (const factor of existing.data.all) {
        if (factor.factor_type === "totp" && factor.status === "unverified") await mfa.unenroll({ factorId: factor.id });
      }
      const { data, error: enrollError } = await mfa.enroll({ factorType: "totp", issuer: "BudgetBuddy" });
      if (enrollError) throw enrollError;
      setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    } catch (caught) {
      failure(caught);
    } finally {
      setBusy(false);
    }
  }

  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (!enrollment) return;
    if (!/^\d{6}$/.test(code)) { setError(tr ? "6 haneli kodu girin." : localized("Enter the 6-digit code.")); return; }
    setBusy(true);
    setError("");
    try {
      const { error: verifyError } = await getSupabaseBrowserClient().auth.mfa.challengeAndVerify({ factorId: enrollment.factorId, code });
      if (verifyError) throw verifyError;
      setFactorId(enrollment.factorId);
      setEnrollment(null);
      setCode("");
      setStatus("on");
      toast.success(tr ? "İki adımlı doğrulama açıldı." : localized("Two-step verification is on."));
    } catch (caught) {
      setCode("");
      failure(caught);
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    if (!factorId) return;
    setBusy(true);
    setError("");
    try {
      const auth = getSupabaseBrowserClient().auth;
      const { error: unenrollError } = await auth.mfa.unenroll({ factorId });
      if (unenrollError) throw unenrollError;
      // Reissue the session so it no longer claims a second factor.
      await auth.refreshSession().catch(() => undefined);
      setFactorId(null);
      setConfirmingOff(false);
      setStatus("off");
      toast.success(tr ? "İki adımlı doğrulama kapatıldı." : localized("Two-step verification is off."));
    } catch (caught) {
      failure(caught);
    } finally {
      setBusy(false);
    }
  }

  function changeOpen(next: boolean) {
    setOpen(next);
    if (next) return;
    // Closing mid-setup discards the half-finished factor.
    if (enrollment) void getSupabaseBrowserClient().auth.mfa.unenroll({ factorId: enrollment.factorId }).catch(() => undefined);
    setEnrollment(null);
    setCode("");
    setError("");
    setConfirmingOff(false);
  }

  const summary = status === "loading" ? (tr ? "Yükleniyor…" : localized("Loading…"))
    : status === "error" ? (tr ? "Durum yüklenemedi" : localized("Unable to load status"))
      : status === "on" ? (tr ? "Açık" : localized("On")) : (tr ? "Kapalı" : localized("Off"));

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <button type="button" className="settings-option-row" disabled={status === "loading"}>
          <span className="settings-row-icon" aria-hidden="true"><ShieldCheck /></span>
          <span className="settings-option-text"><b>{tr ? "İki adımlı doğrulama" : localized("Two-step verification")}</b><small>{summary}</small></span>
          <ChevronRight aria-hidden="true" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tr ? "İki adımlı doğrulama" : localized("Two-step verification")}</DialogTitle>
          <DialogDescription>{tr ? "Girişte şifrene ek olarak kimlik doğrulama uygulamandaki kodu sorar." : localized("Asks for a code from your authenticator app in addition to your password when you sign in.")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 text-sm">
          {status === "error" && <>
            <p role="alert">{tr ? "Durum yüklenemedi." : localized("Unable to load the current status.")}</p>
            <Button variant="outline" onClick={() => { setStatus("loading"); void load(); }}>{tr ? "Tekrar dene" : localized("Try again")}</Button>
          </>}

          {status === "off" && !enrollment && <>
            <p>{tr ? "Google Authenticator, Microsoft Authenticator veya benzeri bir uygulamaya ihtiyacın var." : localized("You need an app such as Google Authenticator or Microsoft Authenticator.")}</p>
            <p className="text-muted-foreground">{tr ? "Telefonuna erişimini kaybedersen hesabına yalnızca destek ekibi üzerinden yeniden girebilirsin." : localized("If you lose access to your phone, you can only get back into your account through support.")}</p>
            <Button disabled={busy} onClick={() => void start()}>{busy ? (tr ? "Hazırlanıyor…" : localized("Preparing…")) : (tr ? "Açmaya başla" : localized("Start setup"))}</Button>
          </>}

          {status === "off" && enrollment && <form onSubmit={(event) => void confirm(event)} className="flex flex-col gap-4" noValidate>
            <p>{tr ? "1. Bu QR kodunu kimlik doğrulama uygulamanla tara." : localized("1. Scan this QR code with your authenticator app.")}</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data URI from Supabase Auth */}
            <img src={enrollment.qrCode} alt={tr ? "İki adımlı doğrulama kurulum QR kodu" : localized("Two-step verification setup QR code")} width={176} height={176} className="mx-auto rounded-lg bg-[var(--c-s-ffffff)] p-2" />
            <p className="text-muted-foreground">{tr ? "Tarayamıyorsan bu anahtarı elle gir:" : localized("Can't scan it? Enter this key by hand:")} <code className="break-all font-mono text-foreground">{enrollment.secret}</code></p>
            <label className="flex flex-col gap-2 font-medium">{tr ? "2. Uygulamadaki 6 haneli kodu yaz." : localized("2. Type the 6-digit code from the app.")}
              <Input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" required aria-invalid={Boolean(error)} className="text-center text-lg tracking-[0.4em]" />
            </label>
            <Button type="submit" disabled={busy}>{busy ? (tr ? "Doğrulanıyor…" : localized("Verifying…")) : (tr ? "Doğrula ve aç" : localized("Verify and turn on"))}</Button>
          </form>}

          {status === "on" && <>
            <p>{tr ? "Açık. Her girişte doğrulama kodu sorulur." : localized("On. A verification code is asked at every sign-in.")}</p>
            {confirmingOff
              ? <>
                <p role="alert">{tr ? "Kapatırsan hesabın yalnızca şifrenle korunur. Emin misin?" : localized("If you turn it off, only your password protects your account. Are you sure?")}</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="destructive" disabled={busy} onClick={() => void turnOff()}>{busy ? "…" : (tr ? "Evet, kapat" : localized("Yes, turn off"))}</Button>
                  <Button variant="outline" disabled={busy} onClick={() => setConfirmingOff(false)}>{tr ? "Vazgeç" : localized("Cancel")}</Button>
                </div>
              </>
              : <Button variant="outline" onClick={() => setConfirmingOff(true)}>{tr ? "Kapat" : localized("Turn off")}</Button>}
          </>}

          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
