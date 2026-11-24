# Budget Buddy

Budget Buddy is a bilingual personal-finance app for individuals and families. It helps people track money, make shared plans, and turn everyday financial habits into goals that are easy to start and maintain.

The application uses **Supabase Auth** for authentication and Supabase/PostgreSQL for application data.

## What you can do

- Create a password-based account, confirm an email address, recover a password, sign out, and optionally use Google sign-in or two-step verification with an authenticator app.
- Track income, expenses, transfers, balances, budgets, financial reports, and savings goals. A bank account is optional for a transaction.
- Set up recurring items such as rent, salary, and bills, and track subscriptions like Netflix or Spotify; the matching transactions are created on schedule.
- Add category rules ("if the description contains Migros, use Groceries") so new and imported transactions are categorized automatically.
- Get in-app notifications for budgets and goals, plus an optional daily e-mail digest.
- Start with a goal in minutes: a bank account or historical transaction is not required.
- Share selected goal progress with a family group without exposing private transactions.
- Create a private monthly allowance plan with a savings percentage.
- Manage family groups, invitations, roles, shared transactions, a shared shopping note, and a live shopping checklist.
- Build occasion wishlists for birthdays, housewarmings, New Year, and other events, on your own or with a family group. Family members can reserve a gift so it is not bought twice. A personal wishlist can also have a revocable, read-only share link.
- Choose surprise mode for a wishlist: the owner cannot see reservations, while other family members can.
- Upload private receipt images, import/export CSV data, and use the Groq-powered financial assistant and voice transaction drafts.
- Choose a profile photo or an icon avatar.
- Use the interface in Turkish or English, in the browser or as an installable web app (PWA).

## Mobile app

The Flutter app in `apps/mobile` is the only mobile release channel. It calls the same API as the website and authenticates with verified Supabase bearer tokens.

**The Flutter app is not feature-complete and has not replaced the current test build.** It has email and password sign-in, overview, transactions list and entry, assistant, accounts, budgets, goals, recurring items, analytics, family, wishlists, and basic settings. These are still missing:

- Google sign-in (in progress, not merged or verified)
- Sign-up, password recovery, and two-step verification
- Transaction edit and delete
- Receipt scanning
- Family invitations
- Some settings

Google Play test tracks now receive Flutter builds only. The Capacitor project was removed from the repository (recover it from git history if needed). The Trusted Web Activity project in `android/` receives no new releases.

To run the app against the local stack from an Android emulator:

```bash
cd apps/mobile
flutter pub get
flutter run --dart-define=API_URL=http://10.0.2.2:5173 --dart-define=SUPABASE_URL=http://10.0.2.2:54321 --dart-define=SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY>
```

## Plans

Every feature is currently free. No payment provider is connected and paid plans are switched off. Subscriptions are only planned.

## Local development

### Requirements

- Node.js 22.13 or newer
- pnpm 11 or newer
- Docker and the [Supabase CLI](https://supabase.com/docs/guides/cli) (for the local Supabase stack)
- A Groq API key for AI features

### Set up

1. Clone the repository and install dependencies.

   ```bash
   git clone https://github.com/melisau/budget-buddy.git
   cd budget-buddy
   pnpm install --frozen-lockfile
   ```

2. Create a local environment file. Never commit real keys.

   ```powershell
   Copy-Item .env.example .env.local
   ```

   On macOS or Linux, use `cp .env.example .env.local`.

3. Start the local Supabase stack. It needs Docker running and the [Supabase CLI](https://supabase.com/docs/guides/cli). There is no hosted development project: production is the only hosted Supabase project, so never point a local run at it.

   ```bash
   supabase start
   ```

   The first run downloads Docker images and applies every file in `supabase/migrations/` in order. `supabase/config.toml` already sets Site URL to `http://localhost:5173` and turns on authenticator-app (TOTP) verification. Accounts are confirmed without email, and `supabase stop` keeps the data (`supabase db reset` wipes it and reapplies the migrations).

4. Put the local values in `.env.local`. Read them from `supabase status -o env`: `API_URL`, `PUBLISHABLE_KEY` and `SECRET_KEY`.

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY>
   SUPABASE_SECRET_KEY=<SECRET_KEY>
   ```

   `SUPABASE_SECRET_KEY` is server-only. Do not put it in a `NEXT_PUBLIC_*` variable. The local keys only work against your own machine.

5. Optional, to try e-mail locally: add `SMTP_HOST=127.0.0.1`, `SMTP_PORT=54325` and `SMTP_FROM=BudgetBuddy <no-reply@budgetbuddy.test>` to `.env.local`, and `CRON_SECRET=` with any 16+ character value. Every e-mail the app sends lands in the local inbox at `http://127.0.0.1:54324`. Trigger the daily notification job with `curl -X POST -H "Authorization: Bearer <CRON_SECRET>" http://localhost:5173/api/cron/notifications`.

6. Sign up in the app at `http://localhost:5173/sign-up`. The local stack does not require email confirmation, so the new account works immediately. To test the production-like confirmation flow, set `enable_confirmations = true` in `supabase/config.toml` and read the emails in the local inbox at `http://127.0.0.1:54324`.

7. Start the development server.

   ```bash
   pnpm dev
   ```

   Visit [http://localhost:5173](http://localhost:5173).

Use a separate Groq key for development. Never use production Supabase or Groq credentials locally.

## Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Technology

- **Web app:** Next.js 16 App Router, React 19, TypeScript
- **Mobile app:** Flutter, Riverpod, go_router, `supabase_flutter`
- **UI:** Tailwind CSS, shadcn/ui, Lucide, Recharts
- **Data and authentication:** Supabase PostgreSQL, Supabase Auth, `@supabase/ssr`, Row Level Security, private Storage buckets
- **AI:** Groq API
- **Payments:** none yet; paid plans are off until a provider is integrated
- **Build:** Vinext (`pnpm build`)
- **E-mail:** SMTP through Resend (notification digests and family invitations)
- **Hosting:** Docker container on a VDS behind a Caddy reverse proxy; see [VDS hosting](docs/vds.md)
- **Backups:** daily `pg_dump` and Storage mirror on the VDS, with an encrypted off-site copy (rclone crypt to Backblaze B2); see [VDS hosting](docs/vds.md#database-and-file-backups)

## Security model

- The website uses Supabase Auth SSR cookies and mobile clients use Supabase bearer tokens. Server routes verify the user before accessing application data, and a rejected bearer token never falls back to a cookie session.
- Browser clients do not receive privileged database credentials. Server routes perform ownership and family-role checks before using the server-only Supabase key.
- Row Level Security is deny-by-default, with read-only policies for a user's own rows and accepted family groups. Writes stay server-only, and the server enforces membership and surprise-wishlist visibility.
- Receipts live in a private Storage bucket and are served through short-lived signed URLs.
- Production data is backed up daily; the off-site copy is encrypted on the server before upload, and the restore procedure is tested against a local stack.
- The AI assistant receives authorized, sanitized financial summaries and cannot create a transaction without an explicit confirmation step.

## Project documentation

- [Architecture](docs/architecture.md)
- [Deployment and release process](docs/deployment.md)
- [VDS hosting](docs/vds.md)
- [Google Play release guide](docs/play-store.md) (describes the earlier, now removed Capacitor build)
- [Legacy account migration runbook](docs/supabase-auth-migration.md)
- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

Active work is tracked in Linear. Changes should be developed in a dedicated branch and reach `main` through a pull request; `main` is protected and only accepts changes whose CI checks pass on an up-to-date branch. Merging does not deploy by itself: production is deployed from `main` on the VDS by hand, or by the optional [auto-deploy cron](docs/vds.md#automatic-deploys) if it is enabled on the server. Database migrations are applied to production as a separate, approved step.

## License

Private software. All rights reserved.
