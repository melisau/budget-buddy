# Auth email templates

Paste these into **Supabase → Authentication → Emails → Templates**. They are
kept here so they are versioned with the code.

| Supabase template | File | Subject |
| --- | --- | --- |
| Confirm signup | `confirmation.html` | `E-postanı doğrula · Confirm your email` |
| Reset password | `recovery.html` | `Şifreni sıfırla · Reset your password` |
| Change email address | `email_change.html` | `E-posta değişikliğini onayla · Confirm your email change` |

Each email is Turkish by default and English when the user's Auth metadata has
`language = "en"` (`{{ if eq .Data.language "en" }}`). The app writes that value
at sign-up and whenever the user switches language while signed in
(`components/providers/auth-language-sync.tsx`). Subjects are bilingual because
Supabase does not document template logic in the subject field.

Links use `/auth/confirm?token_hash=…`, which works even when the email is
opened in a different browser from the one that started the flow.
