# Security Policy

Budget Buddy is a private repository. Do not report vulnerabilities, personal-data risks, or exposed secrets through a public GitHub issue.

## Reporting

Team members should notify each other through a private channel and create a restricted Linear issue with `Urgent` priority and the `bug` label. Never copy real secrets, financial records, or personal data into messages or issues.

## Initial response

1. Revoke or rotate the affected credential or session at the provider.
2. Determine the production impact and whether unauthorized access may have occurred.
3. Roll back to the last healthy deployment when necessary.
4. Review the fix through a focused branch and pull request.
5. Record the root cause, scope, and permanent prevention in Linear without sensitive data.

## Security baseline

- Enable two-factor authentication for GitHub, Vercel, Supabase, Clerk, Stripe, and Sentry accounts.
- Store shared secrets in Bitwarden or 1Password.
- Never use production data or live payment keys in Local or Preview environments.
- Server routes must enforce authentication, authorization, and ownership checks.
- Reassess Supabase RLS, Stripe webhook signatures, and webhook idempotency whenever related behavior changes.
