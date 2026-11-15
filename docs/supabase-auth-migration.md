# Supabase Auth cutover

This runbook covers the move from Clerk to Supabase Auth: what changed, the Auth
settings every Supabase project needs, and how to map existing users safely.
For running the app locally, follow the README; it uses the local Supabase stack
(`supabase start`). There is no hosted development project.

## What changes

Supabase Auth owns sign-up, email confirmation, password sign-in/recovery,
optional Google OAuth, profile display name, password changes, two-step
verification and sign-out. `@supabase/ssr` stores browser sessions in cookies.
The proxy refreshes sessions and copies cookies to both the downstream request
and response. Server routes verify the current user with `auth.getUser()`; they
never trust a browser header or `getSession()` as proof of identity. Auth
responses are not shared-cacheable.

The server-only data client uses the privileged Supabase key. Personal ownership
and family role checks remain mandatory before data access. All application
tables remain inaccessible directly through browser RLS. The only browser-callable
database function is `sync_authenticated_user()`, which derives its identity from
`auth.uid()` and requires a confirmed active account.

## Auth settings for every Supabase project

Never put the privileged key into a `NEXT_PUBLIC_*` variable. Public variables are
embedded at build time: restart the dev server or rebuild after changing them.
Locally, `supabase/config.toml` already sets the Site URL; for the production
project, set these in the Supabase dashboard:

1. Enable email/password and **Confirm email**. Set the password minimum length to
   at least 8, and enable the secure email change and secure password change
   policies.
2. Set the Site URL to the production URL and add only exact callback URLs to the
   redirect allow-list (for example `https://budgetbuddy.melisauyar.com/auth/callback`).
   Do not add broad wildcard redirects.
3. For cross-browser email verification, set the email templates:

   - Confirm signup: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
   - Reset password: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
   - Email change: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change`

   Default PKCE email links also work through `/auth/callback`, but require the
   initiating browser's verifier cookie. Expired links show a retryable sign-in error.
4. Configure SMTP before inviting real users. Supabase's built-in sender is
   restricted and intended for testing. Never disable email confirmation to bypass this.
5. Enable authenticator-app (TOTP) verification so users can turn on two-step
   verification.
6. Optional Google login: configure Google's OAuth client and the Supabase
   provider callback, then set `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true` and rebuild.

A wrong system clock can still break token validation.

## Existing users: preserve data and explicitly map identity

Migration 0014 keeps `public.users.id` and every financial foreign key unchanged.
It adds a unique nullable `auth_user_id` referencing `auth.users`, and makes the
legacy `clerk_user_id` nullable. No user/finance rows are deleted or reassigned.
Old Clerk sessions/passwords are not automatically converted to Supabase sessions.
Existing users must complete Supabase account creation/verification or a separately
reviewed admin import/password-reset process.

An email match **does not** grant access to legacy data. The first login of an
unmapped legacy account is blocked. Before enabling that login, an authorized
administrator must independently verify the old Clerk identity and the new
confirmed Supabase identity, and then run this (against the production project
only with explicit approval):

```sql
select public.link_legacy_auth_user(
  'EXISTING-public.users.id'::uuid,
  'VERIFIED-auth.users.id'::uuid
);
```

This service-role-only function checks the email, locks the identity mapping,
refuses reassignment and is idempotent for an already-correct mapping. It never
merges accounts or trusts editable user metadata. A duplicate/new app account
created before migration requires deliberate manual reconciliation; do not
delete its financial data to make the mapping succeed.

Inspect the mapping and existing balances before permitting cutover. Retain
`clerk_user_id` for audit and rollback planning; dropping it is a later migration.
Keep existing family relationships attached to the same app ID.

## Account deletion

The account API verifies a current Supabase user and requires a same-origin DELETE.
It calls Supabase Auth admin deletion for that verified identity. The foreign key
deletes the linked app row and existing dependent SQL records atomically. A failed
Auth deletion leaves the app row intact. Receipt files and the avatar are then
removed from Storage (a failure there is logged for an administrator to retry),
and browser and server cookies are cleared. Deleting a group owner also deletes
that owner's groups; review or transfer ownership first if needed.

## Verification and release gate

`pnpm test` runs finance checks and in-memory PostgreSQL tests with PGlite. The
tests execute all migrations and check data preservation, explicit mapping,
permission denial, anonymous/unverified/banned users, starter-data idempotency,
RLS denial and account-deletion rollback/cascades. No live credentials are used.
PGlite supplies a minimal Auth schema; it does not replace testing real GoTrue,
SMTP, OAuth, session expiry or two-browser family authorization against the
local Supabase stack.

Before production: test registration, confirmation, invalid password, password
recovery, expired callback, sign-out/back-button behavior, refresh after expiry,
direct API access without a session, two users' data separation and account
deletion on the local stack. Verify mapped legacy balances and memberships.
Production migration, data changes and deployment require a separate release step.

Rollback application code only while Clerk credentials and legacy IDs still exist;
new Supabase-only accounts will not be able to log in to the old Clerk build.
Keep Migration 0014 in place; use a forward fix rather than dropping data columns.
