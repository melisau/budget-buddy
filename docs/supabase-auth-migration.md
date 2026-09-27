# Supabase Auth cutover

## What changes

Supabase Auth owns sign-up, email confirmation, password sign-in/recovery,
optional Google OAuth, profile display name, password changes and sign-out.
`@supabase/ssr` stores browser sessions in cookies. The proxy refreshes sessions
and copies cookies to both the downstream request and response. Server routes
verify the current user with `auth.getUser()`; they never trust a browser header
or `getSession()` as proof of identity. Auth responses are not shared-cacheable.

The existing server-only data client still uses the privileged Supabase key.
Existing personal ownership and family role checks remain mandatory before data
access. All application tables remain inaccessible directly through browser RLS.
The only browser-callable database function is `sync_authenticated_user()`, which
derives its identity from `auth.uid()` and requires a confirmed active account.

## Development setup (no production operations)

1. In a **development** Supabase project, apply pending migrations in order,
   including `0010_supabase_auth.sql`. Never rerun already-applied migrations.
2. Set these variables in that checkout's ignored `.env.local`:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-DEV-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR-DEV-PUBLISHABLE-OR-ANON-KEY
   SUPABASE_SECRET_KEY=YOUR-DEV-SECRET-OR-SERVICE-ROLE-KEY
   NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=false
   ```

   All three Supabase values must belong to the same development project. Never
   put the privileged key into a `NEXT_PUBLIC_*` variable. Remove old Clerk env
   variables from local/deployment settings after cutover. Public variables are
   embedded at build time: restart the dev server or rebuild after changing them.
3. Enable email/password and **Confirm email** in Supabase Auth. Set password
   minimum length to at least 8. Enable secure email change and secure password
   change policies appropriate to the deployment.
4. Set Auth Site URL to `http://localhost:5173`. Add exact local and approved
   preview callback URLs to Auth redirect allowlist:
   `http://localhost:5173/auth/callback` (including query destinations where
   required by the dashboard's matching rules). Use separate project settings
   for production; don't add broad production wildcard redirects.
5. For cross-browser email verification, configure email templates:

   - Confirm signup: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
   - Reset password: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
   - Email change: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change`

   SiteURL templates return to that configured site. Use a dedicated local/dev
   project or deliberately configured preview URL when testing on another host.
   Default PKCE email links also work through `/auth/callback`, but require the
   initiating browser's verifier cookie. Expired links show a retryable sign-in error.
6. Configure SMTP before inviting real users. Supabase's built-in sender is
   restricted and intended for testing; free Auth MAU quota does not promise
   unlimited email delivery. Never disable email confirmation to bypass this.
7. Optional Google login: configure Google's OAuth client and the Supabase
   provider callback, then set `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true` and rebuild.
8. Restart with `pnpm dev`. A wrong system clock can still break token validation.

## Existing users: preserve data and explicitly map identity

Migration 0010 keeps `public.users.id` and every financial foreign key unchanged.
It adds a unique nullable `auth_user_id` referencing `auth.users`, and makes the
legacy `clerk_user_id` nullable. No user/finance rows are deleted or reassigned.
Old Clerk sessions/passwords are not automatically converted to Supabase sessions.
Existing users must complete Supabase account creation/verification or a separately
reviewed admin import/password-reset process.

An email match **does not** grant access to legacy data. The first login of an
unmapped legacy account is blocked. Before enabling that login, an authorized
administrator must independently verify the old Clerk identity and the new
confirmed Supabase identity, and then execute this in the development project:

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
Keep existing subscription and family relationships attached to the same app ID.

## Account deletion

The account API verifies a current Supabase user and requires a same-origin DELETE.
It calls Supabase Auth admin deletion for that verified identity. The foreign key
deletes the linked app row and existing dependent SQL records atomically. A failed
Auth deletion leaves the app row intact. Browser and server cookies are then cleared.
This retains the existing cascading family ownership behavior: deleting a group
owner also deletes that owner's groups. Review/transfer ownership first if needed.

Supabase Storage objects and external Stripe subscriptions are not PostgreSQL
foreign-key children. Their cleanup/cancellation was not implemented by the old
account route either; verify those external resources separately before releasing
account deletion to paying users. Do not promise automatic receipt-file deletion.

## Verification and release gate

`pnpm test` runs finance checks and in-memory PostgreSQL tests with PGlite. The
tests execute all migrations and check data preservation, explicit mapping,
permission denial, anonymous/unverified/banned users, starter-data idempotency,
RLS denial and account-deletion rollback/cascades. No live credentials are used.
PGlite supplies a minimal Auth schema; it does not replace testing real GoTrue,
SMTP, OAuth, session expiry or two-browser family authorization in development.

Before production: test registration, confirmation, invalid password, password
recovery, expired callback, sign-out/back-button behavior, refresh after expiry,
direct API access without a session, two users' data separation and account deletion
in the development project. Verify mapped legacy balances and memberships.
Production migration, data changes and deployment require a separate release step.

Rollback application code only while Clerk credentials and legacy IDs still exist;
new Supabase-only accounts will not be able to log in to the old Clerk build.
Keep migration 0010 in place; use a forward fix rather than dropping data columns.
