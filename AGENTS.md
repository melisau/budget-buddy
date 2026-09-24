# Repository Guidelines

## Source of truth

- Product and engineering work starts with a Linear issue in the `Melisa-Berk Team` team.
- Keep one branch and one pull request focused on one Linear issue.
- `TASKS.md` and `PHASES.md` are historical implementation snapshots, not the active backlog.
- Do not create GitHub Issues for product work. Use Linear and include the issue ID in branch, commit, and pull request context.

## Package manager and commands

- Use Node.js 22.13 or later and pnpm 11.
- Install dependencies with `pnpm install --frozen-lockfile`.
- Run locally with `pnpm dev`.
- Run lint with `pnpm lint`.
- Run type checking with `pnpm typecheck`.
- Run unit tests with `pnpm test`.
- Run a production build with `pnpm build`.
- Do not modify `pnpm-lock.yaml` unless dependencies change.
- Ask before adding a new production dependency.

## Architecture

- Next.js App Router owns pages, layouts, and route handlers under `app/`.
- Authentication and user sessions are managed by Clerk.
- Supabase/PostgreSQL stores application data and receipt files.
- Server routes must derive the acting user from the verified Clerk session; never trust a client-provided user ID.
- Payments are managed by Stripe. Subscription state must be verified from signed, idempotent webhooks.
- Database changes must be forward-only SQL migrations in `supabase/migrations/`.
- Keep server-only credentials and privileged clients out of client components and public environment variables.

## Safety

- Never commit `.env` files, secrets, credentials, personal financial data, or production exports.
- Never expose Clerk secret keys, Supabase secret/service-role keys, Stripe secret keys, or webhook secrets to the client.
- Local and Preview environments must not use production Supabase projects or Stripe live keys.
- Do not read, write, or migrate production data without explicit user approval.
- Do not push directly to `main` or rewrite another contributor's branch.
- Prefer additive, backward-compatible migrations. Use expand-contract for destructive schema changes.

## Implementation workflow

- Read the Linear issue, relevant code, and existing tests before editing.
- Keep changes within the issue's acceptance criteria. Record newly discovered work in a separate Linear issue.
- Add or update tests when behavior changes.
- Update `.env.example` and `docs/deployment.md` when environment requirements change.
- Update `docs/architecture.md` when a durable architectural decision or boundary changes.
- Before completion, run lint, typecheck, tests, and build. Report every skipped or failed check.

## Review priorities

- Flag missing authentication, authorization, ownership, or Supabase RLS checks.
- Flag unverified or non-idempotent Stripe webhook handling.
- Flag secrets, privileged clients, or server-only code exposed to the browser.
- Flag destructive or backward-incompatible database migrations.
- Flag missing loading, empty, error, and mobile states for user-facing changes.
- Treat human approval, CI, and Preview verification as required even when Codex review passes.
