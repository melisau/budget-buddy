# Budget Buddy Architecture

This document describes durable system boundaries. Application behavior belongs in code and tests; active work belongs in Linear.

## System overview

Budget Buddy is a bilingual personal-finance application built with Next.js 16 App Router and React 19. Production runs in a Docker container on a Keyubu VDS behind a Caddy reverse proxy (see [VDS hosting](./vds.md)), Supabase manages identity and stores data and files, and paid plans are switched off until a payment provider is integrated.

```text
Browser
  ├─ Next.js pages and client components
  └─ HTTPS requests
        ↓
Next.js server routes
  ├─ Supabase Auth session verification
  ├─ authorization and validation
  ├─ Supabase/PostgreSQL + private Storage
  └─ Groq assistant with authorized summaries only
```

## Source directories

| Directory | Responsibility |
| --- | --- |
| `app/` | Pages, layouts, and server route handlers |
| `components/` | Product screens, layouts, and reusable UI |
| `lib/auth/` | Supabase Auth sessions, user mapping, and authorization |
| `lib/finance/` | Financial calculations, transformations, and import/export |
| `lib/billing/` | Plans, the launch switch, and subscription rules |
| `lib/supabase/` | Server-side Supabase access |
| `supabase/migrations/` | Ordered, version-controlled schema changes |
| `tests/` | Unit tests run with the Node.js test runner |

## Identity and authorization

- Verify Supabase Auth sessions on the server.
- Route handlers derive the acting user from the verified session and never trust a user ID supplied by the client.
- Ownership protects personal records; active membership and roles protect family records.
- Two-step verification is optional and uses Supabase Auth MFA with an authenticator app (TOTP). When an account has a verified factor, `getCurrentUser()` returns no user until the session reaches `aal2`, so every protected page and API route rejects a password-only session; pages send it to `/auth/two-step`. There are no recovery codes: a user who loses the device is restored by an administrator removing the factor in Supabase after confirming the request comes from the account's email address.
- Notifications (budget at 80% and 100%, goals due within 7 days, family invitations) are stored per user in `notifications`, one row per event (`dedupe_key`). `lib/notifications/rules.ts` decides what is due, `service.ts` stores it, the header bell reads it, and a daily job (`/api/cron/notifications`, bearer `CRON_SECRET`) e-mails a digest over SMTP when configured. Users can turn the e-mail off; invitation e-mails go to the invited address and are rate limited per owner.
- Hiding an action in the UI is not an authorization control. The server must enforce the same rule.
- Supabase secret or service-role credentials remain server-only. RLS provides an additional layer of defense.

## Data and migrations

The stable application user ID (`public.users.id`) owns financial records. The
unique `auth_user_id` links that row to Supabase Auth; legacy `clerk_user_id`
values remain solely for migration/audit. No automatic email-based account linking
is allowed. See [the auth runbook](./supabase-auth-migration.md).

The browser/SSR Auth clients use a publishable key and cookie sessions. The
privileged data client is server-only. Proxy refreshes cookies; every protected
page and API verifies identity using `getUser()` before applying ownership/role
checks. RLS remains deny-by-default for direct browser table access.

Native mobile clients call the same API with `Authorization: Bearer <Supabase access token>`.
The token is verified with `auth.getUser(token)` and goes through the same two-step and
ownership checks. A malformed or rejected Bearer token fails closed and never falls back to
a cookie session.

Since migration 0023, RLS also has read-only (SELECT) policies for the
`authenticated` role that mirror the server's read rules: personal rows only to
their owner, family rows only to accepted members. They apply to any request
made with a user's own session; the privileged server client still bypasses
them. Writes have no policies and stay server-only. `wishlist_items` has no
policy because surprise mode hides columns, which RLS cannot express.
`tests/rls-policies.test.ts` runs every migration in PGlite and checks these
rules as the `authenticated` role.

New identities start with an empty finance workspace; no bank account or
historical transaction is needed to create a personal goal. Existing starter
or real rows are never removed by this onboarding change.

Family collaboration is stored separately from personal finance: shopping items
and the shared note are available to accepted group members, while allowance
plans remain private to their owner. Goal sharing is opt-in and exposes only the
goal name and progress percentage to accepted members. Wishlists are group
scoped and available on the Free plan. Gift reservations use an atomic
unreserved-row update to prevent duplicate claims. In surprise mode the server
omits reservation state from the list owner's response. Owners who leave a
group no longer have their lists or goal shares returned to its members;
stored data is retained.

Wishlists can also be personal (no group). An owner may create an optional
read-only share link (`/w/<token>`, 24 random bytes as base64url). That page
needs no sign-in, is `noindex`, sends no referrer, and shows only the title,
occasion, date and wishes: never reservations or owner identity. Rotating
the link replaces the token; turning it off clears it, revoking access.

- Make persistent schema changes only through SQL files under `supabase/migrations/`.
- Migrations must be ordered, repeatable where practical, and backward-compatible whenever possible.
- Split breaking changes across releases with expand-contract: add the new structure, deploy compatible code, migrate data, then remove the old structure in a later release.
- Do not make undocumented production schema changes through the Supabase Dashboard.

## Payment boundary

- No payment provider is connected. The Stripe integration was removed because Stripe is not available in Turkey; `NEXT_PUBLIC_BILLING_ENABLED` stays `false` and every user has full access.
- When a provider is added: start checkout on the server and validate plan selection against server-controlled price IDs.
- Treat a signature-verified provider notification as the source of truth for subscription state.
- Notification processing must be idempotent so a repeated event cannot create duplicate records or entitlements.

## AI boundary

- Keep Groq credentials and requests on the server.
- Send only the minimum authorized financial summary required for the user's request.
- The assistant receives only an aggregated summary (`lib/finance/assistant-summary.ts`): monthly and per-category totals. Transaction titles, notes, accounts, receipts and custom category names are never sent.
- The assistant does not directly create transactions; a transaction draft requires explicit user confirmation before it is stored.
- Investment advice and access to data outside the verified scope are outside the product boundary.

## Receipt data boundary

- Flutter reads receipts on the device with ML Kit. The photo and raw OCR text are never sent to the server or stored.
- The user confirms the form. `POST /api/receipts` then saves the transaction, `receipts` and optional `receipt_items` atomically through the server-only `save_scanned_receipt` function.
- Scanning is off unless a mobile build sets `RECEIPT_SCAN_ENABLED=true`. Use it only for internal test builds until real-receipt accuracy is measured.
- `receipts.*_edited` records only whether a field was corrected, so accuracy can be measured without reading receipt contents.
- New receipt image uploads are closed. Existing images can still be opened and removed.

## Updating this document

Update this file in the same pull request whenever a new service, persistent data model, security boundary, or deployment approach is introduced. Keep temporary implementation plans and active task details in Linear.


### Profile avatars

Profile presentation lives on the existing app user (`avatar_icon`, `avatar_path`).
`/api/account/avatar` verifies Supabase Auth and can mutate only the acting app
user. Browser metadata cannot assign an avatar to another app user. Photos are
private Storage objects; the server signs only owner-prefixed paths for an
accepted family membership or the user's own profile. No external avatar URL is
accepted. Default icons and initials need no Storage object. Financial ownership,
family roles, invitations and identity mappings are independent of avatar state.
