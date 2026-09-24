# Contributing to Budget Buddy

Budget Buddy uses a lightweight `Linear → branch → pull request → Preview → production` workflow for a two-person team. Linear is the single source of truth for active work.

## 1. Before starting work

1. The Linear issue must have a clear goal, acceptance criteria, priority, assignee, and project.
2. Work expected to take longer than two days should be split into smaller issues.
3. Move an issue to `In Progress` when active development begins.
4. Two people must not work on the same branch at the same time.

`TASKS.md` and `PHASES.md` are historical implementation snapshots. Record new work and current progress in Linear instead of these files.

## 2. Branches and commits

Use the branch name suggested by Linear. If one is unavailable, use one of these formats:

```text
feature/mb-42-subscription-cancel
feature/mb-57-mobile-navbar
fix/mb-61-webhook-retry
```

Always create a branch from an up-to-date `main`:

```bash
git switch main
git pull --ff-only
git switch -c feature/mb-42-subscription-cancel
```

Use a concise Conventional Commit message and include the Linear identifier when practical:

```text
feat(billing): add subscription cancellation MB-42
fix(auth): reject expired invitations MB-31
test(family): cover viewer permissions MB-18
```

Allowed types are `feat`, `fix`, `refactor`, `test`, `docs`, and `chore`.

## 3. Local verification

Run these commands before opening a pull request:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

If a check cannot be run, explain why and describe the remaining risk in the pull request.

## 4. Pull requests

- Start the title with the issue identifier: `MB-42 Add subscription cancellation`.
- Include the Linear link, reason for the change, test steps, and known risks.
- Include desktop and mobile screenshots for user-interface changes.
- Call out migrations and environment-variable changes explicitly.
- Keep the pull request focused; do not mix a feature with a broad refactor.

Merge only after CI passes, the Vercel Preview deployment is verified, the other team member approves, and all review conversations are resolved. Use `Squash and merge`, then delete the feature branch.

## 5. Database and environment changes

- Store schema changes as ordered SQL files under `supabase/migrations/`.
- Apply migrations from a clean state locally, then verify them against the development environment.
- Preview must never use the production Supabase project or Stripe live keys.
- Add new variables to `.env.example` without real values.
- Both team members should review production migrations and secret changes.

## 6. Hotfixes

Create an `Urgent`, `bug`-labelled Linear issue for a critical production problem. Create a short `fix/MB-xxx-description` branch from `main`. Keep the change narrow but retain CI, Preview, and review steps. Record production verification and the root cause in the Linear issue.
