# Deployment and Environment Guide

## Environment model

| Environment | Branch | Supabase | Clerk | Stripe | Deployment |
| --- | --- | --- | --- | --- | --- |
| Local | Personal feature branch | Local or Dev | Development | Sandbox/Test | Developer machine |
| Preview | Pull request branch | Dev | Development | Sandbox/Test | Vercel Preview |
| Production | `main` | Prod | Production | Live | Vercel Production |

Preview must never connect to the production Supabase project or use Stripe live keys.

## Environment variables

Store real values only in a developer's `.env.local`, the appropriate Vercel environment, or the team's password manager. Commit only `.env.example`.

| Variable | Scope | Secret? |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Browser + server | No |
| `CLERK_SECRET_KEY` | Server | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | No |
| `SUPABASE_SECRET_KEY` | Server | Yes |
| `GROQ_API_KEY` | Server | Yes |
| `GROQ_MODEL` | Server | No |
| `STRIPE_SECRET_KEY` | Server | Yes |
| `STRIPE_WEBHOOK_SECRET` | Server | Yes |
| `STRIPE_CORE_PRICE_ID` | Server | No |
| `STRIPE_PRO_PRICE_ID` | Server | No |
| `NEXT_PUBLIC_ERROR_REPORTING_DSN` | Browser + server | No, but keep it environment-specific |

If a secret is committed accidentally, removing it from the repository is not enough. Rotate it immediately at the provider.

## Pull requests and Preview

1. Start work from a Linear issue and its dedicated feature branch.
2. GitHub Actions runs lint, typecheck, tests, and the production build after a push.
3. The Vercel Git integration creates a Preview deployment.
4. Verify the acceptance criteria in Preview, including mobile behavior when relevant.
5. Document migrations and environment-variable changes in the pull request and this guide when appropriate.
6. Squash-merge only after approval from the other team member and resolution of all review conversations.

## Migration order

When application code depends on a schema change:

1. Apply all migrations from a clean local database.
2. Apply and verify the migration against the development Supabase project and Preview deployment.
3. Review the migration in the pull request.
4. Apply the backward-compatible migration to production in a controlled step.
5. Deploy the application from `main` through Vercel Production.
6. Handle destructive cleanup in a separate, later issue and pull request.

Do not run a production migration command or Dashboard operation without explicit team approval.

## Production smoke test

After every production deployment, verify that:

- The landing page loads.
- An existing user can sign in and sign out.
- The dashboard and at least one critical API request succeed.
- An unauthorized user cannot access protected data.
- Sentry has no new critical errors.
- Payment changes were already verified in Preview with Stripe Sandbox.

Record the result in the related Linear issue or release note.

## Rollback

- For an application regression, promote the last healthy Vercel deployment back to production.
- Do not automatically reverse a migration that risks data loss; create a forward-fix migration instead.
- For a leaked secret, rotate the credential first, update the deployment, and review access logs.
- Create an `Urgent`, `bug`-labelled Linear issue for a critical incident and record its impact, timeline, and permanent prevention.
