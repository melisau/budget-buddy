# Deployment and Environment Guide

## Environment model

| Environment | Branch | Supabase (data + Auth) | Payment provider | Deployment |
| --- | --- | --- | --- | --- |
| Local | Personal feature branch | Local Supabase (`supabase start`) | Sandbox/Test | Developer machine |
| Production | `main` | Prod | Live | Docker container on the VDS (`budgetbuddy.melisauyar.com`) |

There is no hosted Preview environment: Vercel no longer builds or serves this repository. Verify a pull request by running its branch locally against the local Supabase stack (`supabase start`, see the README). There is no hosted development project either; production is the only hosted Supabase project. Local must never connect to the production Supabase project or use a payment provider's live keys.

Production hosting, the deploy command and server access are described in [VDS hosting](./vds.md).

## Environment variables

Store real values only in a developer's `.env.local`, the server's `/opt/budgetbuddy/.env.vds` for production, or the team's password manager. Commit only `.env.example`.

| Variable | Scope | Secret? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser + server | No |
| `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED` | Browser | No |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Browser | No |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | No |
| `SUPABASE_SECRET_KEY` | Server | Yes |
| `GROQ_API_KEY` | Server | Yes |
| `GROQ_MODEL` | Server | No |
| `SENTRY_DSN` | Server | No, but keep it environment-specific |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Server | `SMTP_PASSWORD` is secret. Optional: without `SMTP_HOST` and `SMTP_FROM` no e-mail is sent |
| `CRON_SECRET` | Server | Yes. 16+ characters; authorizes the daily notification job |
| `ANDROID_CERT_SHA256` | Server | No. Production only; see [VDS hosting](./vds.md) |
| `NEXT_PUBLIC_BILLING_ENABLED` | Browser + server | No. Keep `false`: no payment provider is connected yet, and every user has full access |

The daily backup job keeps its own settings, including the production database
connection string, in `/opt/budgetbuddy/backup.env` on the server, not in
`.env.vds`, so the app container never sees the database password. The variables
(`BACKUP_DATABASE_URL`, `BACKUP_DIR`, `BACKUP_KEEP_DAYS`, `BACKUP_RCLONE_CONFIG`,
`BACKUP_STORAGE_REMOTE`, `BACKUP_STORAGE_BUCKETS`, `BACKUP_REMOTE`,
`BACKUP_REMOTE_KEEP_DAYS`, `BACKUP_HEALTHCHECK_URL`) are listed in
`deploy/vds/backup.env.example`; `BACKUP_DATABASE_URL` and the rclone config are
secret. See [Database and file backups](./vds.md#database-and-file-backups).

If a secret is committed accidentally, removing it from the repository is not enough. Rotate it immediately at the provider.

## Pull requests and verification

1. Start work from a Linear issue and its dedicated feature branch.
2. GitHub Actions runs lint, typecheck, tests, and the production build after a push.
3. Run the branch locally with `pnpm dev` against the local Supabase stack.
4. Verify the acceptance criteria there, including mobile behavior when relevant.
5. Document migrations and environment-variable changes in the pull request and this guide when appropriate.
6. Squash-merge only after approval from the other team member and resolution of all review conversations.

## Migration order

For the Supabase Auth cutover, follow [the migration runbook](./supabase-auth-migration.md)
for development credentials, email templates, callback URLs and explicit legacy
identity mapping. Migration 0014 must precede the new auth application release.

Migration 0015 adds private allowance plans, opt-in goal shares, group shopping
lists/notes, and gift wishlists. Apply it to the local Supabase stack
before testing these routes. New users then start without sample accounts or
transactions. Existing finance rows are preserved. Do not point Local
at production to test family collaboration or surprise mode.

When application code depends on a schema change:

1. Apply all migrations from a clean local database.
2. Apply and verify the migration against the local Supabase stack from a local run of the branch (`supabase start` applies every migration; use `supabase db reset` to re-run them from scratch).
3. Review the migration in the pull request.
4. Apply the backward-compatible migration to production in a controlled step.
5. Deploy the application from `main` with the VDS deploy script (see [VDS hosting](./vds.md)).
6. Handle destructive cleanup in a separate, later issue and pull request.

Do not run a production migration command or Dashboard operation without explicit team approval.

## Migration 0012 — shared rate limits

`0012_rate_limits.sql` adds the `rate_limit_buckets` table and the service-role-only
`check_rate_limit()` function used by the transaction, assistant and error-report APIs.
The application falls back to a per-instance in-memory limit (and logs
`[rate-limit] shared limiter unavailable`) until the migration is applied, so it is safe
to deploy the code first. Apply it locally, verify, then apply it to Prod.

## Production smoke test

After every production deployment, verify that:

- The landing page loads.
- An existing user can sign in and sign out.
- The dashboard and at least one critical API request succeed.
- An unauthorized user cannot access protected data.
- Sentry has no new critical errors.
- Payment changes were already verified locally with the payment provider's sandbox.

Record the result in the related Linear issue or release note.

## Rollback

- For an application regression, revert the offending change on `main` through a pull request and redeploy with the VDS deploy script.
- Do not automatically reverse a migration that risks data loss; create a forward-fix migration instead.
- The free Supabase plan has no automatic backups. Before a risky production migration, run the backup job by hand (`/opt/budgetbuddy/deploy/vds/backup.sh`). To recover lost data, follow [Restoring a backup](./vds.md#restoring-a-backup).
- For a leaked secret, rotate the credential first, update the deployment, and review access logs.
- Create an `Urgent`, `bug`-labelled Linear issue for a critical incident and record its impact, timeline, and permanent prevention.


## Migration 0019 — notifications

`0019_notifications.sql` adds the `notifications` table (budget, goal and
invitation notifications, one row per event) and `users.notify_email`. It is
additive. The application hides the notification bell until the migration is
applied, so it is safe to deploy the code first. Apply it locally, verify, then
apply it to production in a controlled step (explicit approval required).

Notifications work in the app without any configuration. To also send e-mail
(daily digest of new budget and goal notifications, and the family invitation
e-mail), set the `SMTP_*` variables in `.env.vds` and redeploy; use a real
sending provider, since Supabase's built-in sender is for testing only. The
same SMTP account should be set in Supabase Auth so sign-up and password
e-mails are reliable. The daily job needs `CRON_SECRET` and a cron entry on
the server, described in [VDS hosting](./vds.md).

## Migration 0017 — profile avatars

Apply `0017_profile_avatars.sql` to the local stack before testing this release. It adds
`users.avatar_icon` (default: initials) and an optional owner-prefixed
`users.avatar_path`; financial IDs and Auth identities are unchanged. Existing
users RLS continues to deny direct browser updates. Run the migration in the
controlled production migration step before deploying avatar-aware code.

The first authorized photo upload creates the private `budgetbuddy-avatars`
Storage bucket through the existing server-only Supabase client. It accepts
JPEG/PNG/WebP up to 2 MB after the browser produces a 256px square thumbnail.
No bucket is made public and no additional environment variables are required.
The server validates the image signature and derives the owner from the session.
Only confirmed family members' avatars are included in family responses, with
private signed URLs valid for one hour. Pending members do not expose a photo.

Verify locally: upload a photo, choose each default icon, reload, check another
accepted family member can see it, check outsiders cannot access the family,
and delete a test account. Replacing a photo or selecting an icon removes the
previous object; a failed database update removes the new upload. Account
deletion also removes the current avatar after identity deletion. Failed cleanup
is logged and should be retried by an administrator.

## Migration 0020 — recurring items and subscriptions

`0020_recurring_items.sql` adds the `recurring_items` table (rent, salary, bills
and subscriptions such as Netflix, weekly, monthly or yearly) and the nullable
`transactions.recurring_item_id` column with a unique index on
`(recurring_item_id, transaction_date)`. It is additive. Until it is applied the
Recurring page says the feature is not ready, and nothing else changes, so it is
safe to deploy the code first. Apply it locally, verify, then apply it to
production in a controlled step (explicit approval required).

Due items become real transactions whenever the user opens the dashboard, the
transactions list or the Recurring page. No cron job is needed. The unique index
guarantees that repeated or concurrent loads create each occurrence once. Dates
in the past are never back-filled when an item is created or resumed, and one
run creates at most the 36 most recent missed occurrences.
