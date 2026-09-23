# Budget Buddy Architecture

This document describes durable system boundaries. Application behavior belongs in code and tests; active work belongs in Linear.

## System overview

Budget Buddy is a bilingual personal-finance application built with Next.js 16 App Router and React 19. Vercel hosts the application, Clerk manages identity, Supabase stores data and files, and Stripe handles payments.

```text
Browser
  ├─ Next.js pages and client components
  └─ HTTPS requests
        ↓
Next.js server routes
  ├─ Clerk session verification
  ├─ authorization and validation
  ├─ Supabase/PostgreSQL + private Storage
  ├─ Stripe Checkout/Portal/Webhooks
  └─ Groq assistant with authorized summaries only
```

## Source directories

| Directory | Responsibility |
| --- | --- |
| `app/` | Pages, layouts, and server route handlers |
| `components/` | Product screens, layouts, and reusable UI |
| `lib/auth/` | Clerk sessions, user mapping, and authorization |
| `lib/finance/` | Financial calculations, transformations, and import/export |
| `lib/billing/` | Stripe client, plans, and subscription rules |
| `lib/supabase/` | Server-side Supabase access |
| `supabase/migrations/` | Ordered, version-controlled schema changes |
| `tests/` | Unit tests run with the Node.js test runner |

## Identity and authorization

- Verify Clerk sessions on the server.
- Route handlers derive the acting user from the verified session and never trust a user ID supplied by the client.
- Ownership protects personal records; active membership and roles protect family records.
- Hiding an action in the UI is not an authorization control. The server must enforce the same rule.
- Supabase secret or service-role credentials remain server-only. RLS provides an additional layer of defense.

## Data and migrations

- Make persistent schema changes only through SQL files under `supabase/migrations/`.
- Migrations must be ordered, repeatable where practical, and backward-compatible whenever possible.
- Split breaking changes across releases with expand-contract: add the new structure, deploy compatible code, migrate data, then remove the old structure in a later release.
- Do not make undocumented production schema changes through the Supabase Dashboard.

## Payment boundary

- Start Checkout and Customer Portal sessions on the server.
- Validate plan selection against server-controlled Stripe price IDs.
- Treat a signature-verified Stripe webhook as the source of truth for subscription state.
- Webhook processing must be idempotent so a repeated event cannot create duplicate records or entitlements.

## AI boundary

- Keep Groq credentials and requests on the server.
- Send only the minimum authorized financial summary required for the user's request.
- The assistant does not directly create transactions; a transaction draft requires explicit user confirmation before it is stored.
- Investment advice and access to data outside the verified scope are outside the product boundary.

## Updating this document

Update this file in the same pull request whenever a new service, persistent data model, security boundary, or deployment approach is introduced. Keep temporary implementation plans and active task details in Linear.
