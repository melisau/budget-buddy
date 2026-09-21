# Budget Buddy

Budget Buddy is a bilingual personal-finance application for tracking income, expenses, accounts, budgets, savings goals, family finances, receipts, and AI-assisted financial explanations.

## Highlights

- Clerk authentication with server-side authorization
- Supabase/PostgreSQL persistence and starter data for new users
- Personal and family transactions with role-aware access control
- Secure receipt uploads for JPG, PNG, and WEBP files up to 5 MB
- Accounts, budgets, CSV import/export, and financial reports
- Turkish and English user interfaces
- Groq-powered cloud assistant with optional live EUR/TRY reference rates
- Conversation history, voice input, and confirmed voice transaction drafts
- Free, Core, and Pro plan definitions with Stripe Checkout groundwork

## Technology

- Next.js 16, React 19, and TypeScript
- Vinext and Cloudflare Workers runtime
- Supabase for application data and private storage
- Clerk for authentication
- Tailwind CSS, shadcn/ui, Lucide, and Recharts
- Groq for fast cloud AI inference

## Local setup

Requirements: Node.js 22.13 or later, pnpm 11, a Clerk application, a Supabase project, and a Groq API key for AI features.

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy `.env.example` to `.env.local` and configure Clerk and Supabase.

3. Apply `supabase/migrations` through the Supabase SQL Editor, in filename order.

   Existing deployments must also apply new migrations as they are added. Migration
   `0008_repair_user_plan_constraint.sql` repairs legacy plan values that can block
   Clerk user synchronization.

4. Add `GROQ_API_KEY` to `.env.local`. The optional `GROQ_MODEL` defaults to `openai/gpt-oss-20b`.

5. Start the application:

   ```bash
   pnpm dev
   ```

Open `http://localhost:5173`.

## Quality checks

```bash
pnpm lint
node node_modules/typescript/bin/tsc --noEmit
pnpm build
```

## Environment variables

Keep real values in `.env.local`; it is ignored by Git. `.env.example` documents the variable names without secrets.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk browser key |
| `CLERK_SECRET_KEY` | Clerk server key |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Supabase server key |
| `GROQ_API_KEY` | Server-only Groq API key |
| `GROQ_MODEL` | Groq model ID; defaults to `openai/gpt-oss-20b` |
| `STRIPE_SECRET_KEY` | Stripe server key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature secret |
| `STRIPE_CORE_PRICE_ID` / `STRIPE_PRO_PRICE_ID` | Stripe recurring price IDs |

Use separate Clerk, Supabase, Stripe, and Groq configuration for development and production.

## Billing status

The application stores trial and subscription status, provides Stripe Checkout and Customer Portal routes, records invoices, and verifies Stripe webhook signatures. Apply every migration, configure Stripe product prices, and register `POST /api/billing/webhook` in Stripe before enabling payments. New accounts retain full application access throughout their 14-day trial.

## Security notes

- Server-only Supabase and Clerk keys are never exposed to the browser.
- Receipt files are private and use short-lived signed URLs.
- Accepted family members can view shared transactions; only a transaction owner can change a family transaction.
- AI requests are rate-limited and use only authorized financial context.
- Signed-in client and route-boundary failures are rate-limited and retained in the private `error_events` table for investigation.

## License

This project is private and not licensed for redistribution.
