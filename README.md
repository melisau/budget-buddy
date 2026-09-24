# Budget Buddy

Budget Buddy is a bilingual personal-finance app for individuals and families. It helps people track money, make shared plans, and turn everyday financial habits into goals that are easy to start and maintain.

The application uses **Supabase Auth** for authentication and Supabase/PostgreSQL for application data. Clerk has been removed from the running application.

## What you can do

- Create a password-based account, confirm an email address, recover a password, sign out, and optionally use Google sign-in.
- Track income, expenses, transfers, balances, budgets, financial reports, and savings goals.
- Start with a goal in minutes: a bank account or historical transaction is not required.
- Share selected goal progress with a family group without exposing private transactions.
- Create a private monthly allowance plan with a savings percentage.
- Manage family groups, invitations, roles, shared transactions, a shared shopping note, and a live shopping checklist.
- Build occasion wishlists for birthdays, housewarmings, New Year, and other events. Family members can reserve a gift so it is not bought twice.
- Choose surprise mode for a wishlist: the owner cannot see reservations, while other family members can.
- Upload private receipt images, import/export CSV data, and use the Groq-powered financial assistant and voice transaction drafts.
- Use the interface in Turkish or English.

## Plans

The Free plan includes manual tracking, personal goals, family wishlists, the shared shopping list, and allowance planning. Core and Pro provide additional account, reporting, and AI capabilities; Stripe support is included as payment infrastructure but requires separate Stripe configuration before it is enabled.

## Local development

### Requirements

- Node.js 22.13 or newer
- pnpm 11 or newer
- A **development** Supabase project
- A Groq API key for AI features

### Set up

1. Clone the repository and install dependencies.

   ```bash
   git clone https://github.com/melisau/budget-buddy.git
   cd budget-buddy
   pnpm install
   ```

2. Create a local environment file. Never commit real keys.

   ```powershell
   Copy-Item .env.example .env.local
   ```

   On macOS or Linux, use `cp .env.example .env.local`.

3. Set the Supabase values from the **same development project** in `.env.local`:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-DEV-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR-DEV-PUBLISHABLE-KEY
   SUPABASE_SECRET_KEY=YOUR-DEV-SECRET-KEY
   ```

   `SUPABASE_SECRET_KEY` is server-only. Do not use a production project or put this key in a `NEXT_PUBLIC_*` variable.

4. In the Supabase SQL Editor for the development project, apply every file in `supabase/migrations/` in numeric order. Do not rerun migrations that are already recorded as applied.

5. Configure Supabase Auth before testing registration:

   - Enable Email/Password and Confirm email.
   - Set Site URL to `http://localhost:5173`.
   - Add `http://localhost:5173/auth/callback` to the redirect allow-list.
   - Configure email templates and SMTP when testing with real recipients. Details are in the migration runbook below.

6. Start the development server.

   ```bash
   pnpm dev
   ```

   Visit [http://localhost:5173](http://localhost:5173).

Use separate Supabase, Stripe, and Groq projects/keys for development, preview, and production.

## Migrating from Clerk

Clerk is not used for current sign-in or authorization. Migration `0010_supabase_auth.sql` keeps the old `clerk_user_id` only as a legacy audit/mapping field; it is not a credential and is not used at runtime.

Existing financial rows are preserved and are **not** automatically matched solely by email. Before an existing user can access legacy data, an administrator must independently verify and explicitly link the old app identity with the confirmed Supabase Auth identity. Follow the complete safety checklist in [docs/supabase-auth-migration.md](docs/supabase-auth-migration.md). Apply and test migrations in development first; do not use this setup guide to change production data.

## Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Technology

- **App:** Next.js 16, React 19, TypeScript
- **UI:** Tailwind CSS, shadcn/ui, Lucide, Recharts
- **Data and authentication:** Supabase PostgreSQL, Supabase Auth, `@supabase/ssr`, Row Level Security, private Storage buckets
- **AI:** Groq API
- **Payments:** Stripe Checkout and webhook verification groundwork
- **Deployment runtime:** Vinext and Cloudflare Workers

## Security model

- Supabase Auth sessions use SSR cookies; server routes verify the signed-in user before accessing application data.
- Browser clients do not receive privileged database credentials. Server routes perform ownership and family-role checks before using the server-only Supabase key.
- New family collaboration tables are protected with RLS; the server enforces membership and surprise-wishlist visibility.
- Receipts live in a private Storage bucket and are served through short-lived signed URLs.
- The AI assistant receives authorized, sanitized financial summaries and cannot create a transaction without an explicit confirmation step.

## Project documentation

- [Supabase Auth migration runbook](docs/supabase-auth-migration.md)
- [Architecture](docs/architecture.md)
- [Deployment and release process](docs/deployment.md)
- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

Active work is tracked in Linear. Changes should be developed in a dedicated branch and reach `main` through a reviewed pull request with passing checks.

## License

Private software. All rights reserved.
