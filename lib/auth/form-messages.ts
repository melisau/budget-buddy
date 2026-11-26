import type { Language } from "@/lib/i18n/localized";

// English and German versions of the sign-in page messages in lib/auth/form.ts
// (the Turkish ones live there). Keyed by the same codes.
const messages: Record<"en" | "de", Record<string, string>> = {
  en: {
    confirmation: "Check your e-mail to confirm your account. You can sign in after confirming.",
    recovery: "If an account exists for this e-mail, a password reset link has been sent.",
  },
  de: {
    confirmation: "Prüfe deine E-Mails, um dein Konto zu bestätigen. Danach kannst du dich anmelden.",
    recovery: "Falls es ein Konto mit dieser E-Mail gibt, wurde ein Link zum Zurücksetzen des Passworts gesendet.",
  },
};
const errors: Record<"en" | "de", Record<string, string>> = {
  en: {
    invalid: "Check your e-mail address and password. A new password needs at least 8 characters.",
    credentials: "Wrong e-mail or password.",
    unconfirmed: "Confirm your e-mail address before signing in.",
    rate: "The e-mail or attempt limit was reached. Wait a while and try again.",
    email: "The confirmation e-mail could not be sent. Please try again later.",
    disabled: "Creating new accounts is currently turned off.",
    weak: "Your password does not meet the security rules. Choose a stronger one.",
    session: "Your session is invalid or has expired. Sign in again.",
    failed: "The action could not be completed. Check your connection and try again.",
    callback: "The link is invalid or has expired. Please try again.",
    confirmation: "The confirmation link is invalid or has expired.",
    twostep: "Complete two-step verification first.",
  },
  de: {
    invalid: "Prüfe deine E-Mail-Adresse und dein Passwort. Ein neues Passwort braucht mindestens 8 Zeichen.",
    credentials: "E-Mail oder Passwort ist falsch.",
    unconfirmed: "Bestätige zuerst deine E-Mail-Adresse, um dich anzumelden.",
    rate: "Das E-Mail- oder Versuchslimit ist erreicht. Warte eine Weile und versuche es erneut.",
    email: "Die Bestätigungs-E-Mail konnte nicht gesendet werden. Bitte versuche es später erneut.",
    disabled: "Neue Konten können derzeit nicht erstellt werden.",
    weak: "Dein Passwort erfüllt die Sicherheitsregeln nicht. Wähle ein stärkeres.",
    session: "Deine Sitzung ist ungültig oder abgelaufen. Melde dich erneut an.",
    failed: "Die Aktion konnte nicht abgeschlossen werden. Prüfe deine Verbindung und versuche es erneut.",
    callback: "Der Link ist ungültig oder abgelaufen. Bitte versuche es erneut.",
    confirmation: "Der Bestätigungslink ist ungültig oder abgelaufen.",
    twostep: "Schließe zuerst die Zwei-Faktor-Authentifizierung ab.",
  },
};

/** The message for a status or error code in the reader's language; Turkish comes from `turkish`. */
export function authText(kind: "message" | "error", code: string, language: Language, turkish: Record<string, string>): string {
  if (language === "tr") return typeof turkish[code] === "string" ? turkish[code] : "";
  const table = (kind === "message" ? messages : errors)[language];
  return typeof table[code] === "string" ? table[code] : typeof turkish[code] === "string" ? errors[language].failed : "";
}
