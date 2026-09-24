export type AuthMode = "sign-in" | "sign-up" | "forgot-password" | "update-password";
export function isAuthMode(value: unknown): value is AuthMode {
  return typeof value === "string" && ["sign-in", "sign-up", "forgot-password", "update-password"].includes(value);
}
export const authMessages: Record<string, string> = {
  confirmation: "Hesabınızı doğrulamak için e-postanızı kontrol edin. Doğrulama sonrasında giriş yapabilirsiniz.",
  recovery: "Bu e-posta için bir hesap varsa şifre yenileme bağlantısı gönderildi.",
};
export const authErrors: Record<string, string> = {
  invalid: "E-posta adresinizi ve şifrenizi kontrol edin. Yeni şifre en az 8 karakter olmalı.",
  credentials: "E-posta veya şifre hatalı.",
  unconfirmed: "Giriş yapmak için önce e-posta adresinizi doğrulayın.",
  rate: "E-posta veya deneme sınırına ulaşıldı. Bir süre bekleyip tekrar deneyin.",
  email: "Doğrulama e-postası gönderilemedi. Supabase e-posta gönderici/SMTP ayarlarını kontrol edin.",
  disabled: "Yeni hesap oluşturma şu anda kapalı.",
  weak: "Şifreniz güvenlik koşullarını karşılamıyor. Daha güçlü bir şifre seçin.",
  session: "Oturumunuz geçersiz veya süresi dolmuş. Yeniden giriş yapın.",
  failed: "İşlem tamamlanamadı. Bağlantınızı ve Supabase ayarlarını kontrol edip tekrar deneyin.",
  callback: "Bağlantı geçersiz veya süresi dolmuş. Lütfen yeniden deneyin.",
  confirmation: "Doğrulama bağlantısı geçersiz veya süresi dolmuş.",
};
export function authErrorCode(error: unknown): string {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (code === "invalid_credentials") return "credentials";
  if (code === "email_not_confirmed") return "unconfirmed";
  if (["over_email_send_rate_limit", "over_request_rate_limit", "over_sms_send_rate_limit"].includes(code)) return "rate";
  if (["email_address_not_authorized", "email_address_invalid", "unexpected_failure"].includes(code)) return "email";
  if (code === "signup_disabled") return "disabled";
  if (code === "weak_password" || code === "same_password") return "weak";
  return "failed";
}
