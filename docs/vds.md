# VDS hosting

BudgetBuddy production (`budgetbuddy.melisauyar.com`) runs on a shared VDS hosted by Keyubu, not on Vercel.

## Layout

- The app runs in a Docker container named `budgetbuddy`, behind the server's shared Caddy reverse proxy.
- Code lives in `/opt/budgetbuddy` on the server.
- Vercel no longer serves the site. Settings in `vercel.json` (such as crons) and Vercel environment variables have no effect.

## Deploying

Deploy a branch from GitHub with:

```bash
/opt/budgetbuddy/deploy/vds/deploy.sh [branch]
```

The default branch is `main`. `/opt/budgetbuddy` is a git repository that `deploy.sh` only fetches into: it builds the image from a `git archive` copy in `/opt/budgetbuddy/.release`, so files in the repository do **not** appear in the `/opt/budgetbuddy` working folder. `deploy.sh` and the other deploy files under `deploy/vds/` exist only on the server, not in this repository. The backup scripts (`backup.sh`, `restore.sh`, `backup.env.example`) are in the repository and are copied into `/opt/budgetbuddy/deploy/vds/` by hand (see [One-time setup](#one-time-setup-server-owner)).

## Environment variables

- Production variables live in `/opt/budgetbuddy/.env.vds`.
- `NEXT_PUBLIC_*` variables are embedded at build time. After changing one, redeploy.
- `ANDROID_CERT_SHA256` (the SHA-256 values from Google Play app signing, used by `/.well-known/assetlinks.json`) belongs in `.env.vds`, followed by a redeploy.

## Daily notification job

Budget and goal notifications are created, and e-mailed as one digest per user, by a daily call to `POST /api/cron/notifications`. The endpoint has no user session; it requires `CRON_SECRET` from `.env.vds` as a bearer token and answers 503 when the secret is not set. Without the cron entry, notifications are still created when users open the app, but nobody is e-mailed.

Create `/opt/budgetbuddy/notify.sh` (mode 700, owned by root):

```bash
#!/bin/sh
set -a; . /opt/budgetbuddy/.env.vds; set +a
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://budgetbuddy.melisauyar.com/api/cron/notifications
```

and `/etc/cron.d/budgetbuddy-notify` (the server clock is assumed UTC; 05:00 UTC is 08:00 in Türkiye):

```
0 5 * * * root /opt/budgetbuddy/notify.sh >> /var/log/budgetbuddy-notify.log 2>&1
```

The response reports `users`, `created`, `emailed`, `failed` and whether e-mail is configured.

## Database and file backups

The hosted Supabase project (`fnhzuvhjpnothuuzbnkv`) is on the free plan, which has **no automatic backups**. A daily cron on the server runs [`deploy/vds/backup.sh`](../deploy/vds/backup.sh), which:

1. Dumps the database with `pg_dump` (the `public` schema with its data, plus the user accounts in `auth.users` and `auth.identities`) into a dated folder, compressed, with SHA-256 checksums, and checks that the dumps can be read back.
2. Mirrors the private Storage buckets `budgetbuddy-receipts` and `budgetbuddy-avatars` through Supabase's S3 endpoint. Files that are later changed or deleted are moved to a dated `files/changed/` folder instead of being lost.
3. Deletes local dumps older than `BACKUP_KEEP_DAYS` (default 14).
4. Copies everything to an off-site storage bucket and deletes off-site dumps older than `BACKUP_REMOTE_KEEP_DAYS` (default 60).

The script only reads production. `pg_dump` and `rclone` run in pinned Docker images (`postgres:17-alpine`, `rclone/rclone:1.68.2`), so nothing else needs installing. Not backed up: sign-in sessions (users sign in again after a restore), Auth settings in the Dashboard, and `pg_cron` jobs, which the migrations create.

Off-site storage: **Backblaze B2** is recommended (10 GB free, no card needed, S3-compatible). Cloudflare R2 or any other S3-compatible store works the same way through rclone. The dumps contain personal financial data, so the off-site copy goes through an rclone `crypt` remote: files are encrypted on the server before upload, and the storage provider only sees encrypted data. Keep the two crypt passwords in the password manager too: **without them the off-site copy cannot be read**.

### One-time setup (server owner)

Deploys do not place the scripts in `/opt/budgetbuddy/deploy/vds/`, so copy them there from the fetched `main` (run `deploy.sh` first, or `git -C /opt/budgetbuddy fetch -q https://github.com/melisau/budget-buddy.git main:refs/remotes/origin/main`). Run the same commands again after a later change to the scripts; the cron keeps using the copied version until then.

```bash
cd /opt/budgetbuddy
for f in backup.sh restore.sh backup.env.example; do git show "origin/main:deploy/vds/$f" > "deploy/vds/$f"; done
chmod 700 deploy/vds/backup.sh deploy/vds/restore.sh
ls -la deploy/vds/
```

1. **Settings file.** Create it from the example and fill in `BACKUP_DATABASE_URL`: Supabase Dashboard → **Connect** → **Session pooler** connection string, with the database password in place of `[PASSWORD]`. (The direct connection is IPv6-only on the free plan; the session pooler works over IPv4.)

   ```bash
   cp /opt/budgetbuddy/deploy/vds/backup.env.example /opt/budgetbuddy/backup.env
   chmod 600 /opt/budgetbuddy/backup.env
   nano /opt/budgetbuddy/backup.env
   ```

2. **Storage access key.** Supabase Dashboard → **Project Settings** → **Storage** → **S3 Connection**: note the endpoint and region, and create an access key (**New access key**). This key can read and write every bucket, so keep it only on the server.

3. **Off-site bucket.** In Backblaze B2: create a private bucket (for example `budgetbuddy-backups`), then an application key limited to that bucket. Note the key ID and key.

4. **rclone config.** Make two random passwords and turn each into rclone's stored form (save the plain passwords in the password manager first):

   ```bash
   openssl rand -base64 30
   openssl rand -base64 30
   docker run --rm rclone/rclone:1.68.2 obscure 'FIRST-PASSWORD'
   docker run --rm rclone/rclone:1.68.2 obscure 'SECOND-PASSWORD'
   ```

   Create `/opt/budgetbuddy/rclone.conf` (`chmod 600`) with the values filled in:

   ```ini
   [supabase]
   type = s3
   provider = Other
   endpoint = https://fnhzuvhjpnothuuzbnkv.storage.supabase.co/storage/v1/s3
   region = REGION-FROM-STEP-2
   access_key_id = KEY-ID-FROM-STEP-2
   secret_access_key = SECRET-FROM-STEP-2
   force_path_style = true

   [b2]
   type = b2
   account = B2-KEY-ID
   key = B2-APPLICATION-KEY

   [offsite]
   type = crypt
   remote = b2:budgetbuddy-backups/budgetbuddy
   password = OBSCURED-FIRST-PASSWORD
   password2 = OBSCURED-SECOND-PASSWORD
   ```

   With `BACKUP_STORAGE_REMOTE=supabase` and `BACKUP_REMOTE=offsite:` (the values in the example) the script uses these remotes. To skip files or the off-site copy, leave that variable empty.

5. **First run by hand**, then check the result:

   ```bash
   /opt/budgetbuddy/deploy/vds/backup.sh
   ls -la /var/backups/budgetbuddy/db/
   docker run --rm -v /opt/budgetbuddy/rclone.conf:/config/rclone/rclone.conf:ro rclone/rclone:1.68.2 ls offsite:db
   ```

   The last line of the output should be `backup: done: …`.

6. **Cron entry** `/etc/cron.d/budgetbuddy-backup` (02:30 UTC is 05:30 in Türkiye, before the notification job):

   ```
   30 2 * * * root /opt/budgetbuddy/deploy/vds/backup.sh >> /var/log/budgetbuddy-backup.log 2>&1
   ```

7. Optional but recommended: create a free check at healthchecks.io (daily period), put its ping URL in `BACKUP_HEALTHCHECK_URL`, and you get an e-mail when a day's backup fails or does not run.

Check `/var/log/budgetbuddy-backup.log` now and then; a failed run ends with `backup: FAILED: …` and the reason.

### Restoring a backup

[`deploy/vds/restore.sh`](../deploy/vds/restore.sh) loads one dated backup folder into a target database. The target must already have the schema (all migrations in `supabase/migrations` applied). In one transaction, it then **deletes every row in the target's `public` schema and every user account**, and loads the backup's rows; if anything fails, the transaction is rolled back and the target is left as it was. It refuses to run without the `--yes-replace-all-data` argument, and prints the target host first.

To get backups back from off-site (for example on a new server), copy them down first:

```bash
docker run --rm -v /opt/budgetbuddy/rclone.conf:/config/rclone/rclone.conf:ro -v /var/backups/budgetbuddy:/data rclone/rclone:1.68.2 copy offsite: /data
```

**A. Production lost data (same project).** Take a fresh backup first, so the current state can still be recovered, then restore the chosen day. This replaces all production data and signs everyone out; only the owner does this.

```bash
/opt/budgetbuddy/deploy/vds/backup.sh
ls /var/backups/budgetbuddy/db/
set -a; . /opt/budgetbuddy/backup.env; set +a
RESTORE_DATABASE_URL="$BACKUP_DATABASE_URL" /opt/budgetbuddy/deploy/vds/restore.sh /var/backups/budgetbuddy/db/CHOSEN-DATE --yes-replace-all-data
```

A restore does not delete receipt files from Storage. To also put back missing files, add `RESTORE_STORAGE_REMOTE=supabase` in front of the restore command.

**B. The Supabase project is gone (new project).**

1. Create a new Supabase project. On a computer with the repository: `supabase link --project-ref NEW-REF` and `supabase db push` to apply every migration.
2. Create an S3 access key for the new project and add it to `rclone.conf` as a new remote, for example `[supabase-new]` (same shape as `[supabase]`, new endpoint).
3. On the server, restore into the new project's session pooler URL:

   ```bash
   RESTORE_DATABASE_URL='NEW-SESSION-POOLER-URL' RESTORE_STORAGE_REMOTE=supabase-new /opt/budgetbuddy/deploy/vds/restore.sh /var/backups/budgetbuddy/db/CHOSEN-DATE --yes-replace-all-data
   ```

4. Set up Auth in the new project as in [the Supabase Auth runbook](./supabase-auth-migration.md) (site URL, redirect URLs, Google provider, SMTP).
5. Put the new `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` in `.env.vds`, the new URL in `backup.env`, and the new keys in the `[supabase]` remote of `rclone.conf`, then redeploy `main`.

Users keep their passwords (password hashes are part of `auth.users`) and sign in again.

If production's schema was changed by hand and no longer matches the migrations, the data load stops with a column error and rolls back. The backup also holds the schema, so the difference can be inspected with `pg_restore --schema-only --file=- public.dump` (in the `postgres:17-alpine` image).

### Restore test

The restore was tested on 2026-11-16 against the local Supabase stack. Re-test it the same way every few months:

1. Start a second, empty local stack from a copy of `supabase/` with another `project_id` and ports (for example `project_id = "bb-restore-test"`, every `543xx` port changed to `553xx`), so the development database is not touched. `supabase start` applies every migration there.
2. Run `backup.sh` against the development stack (`BACKUP_DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:54322/postgres`, `BACKUP_DOCKER_NETWORK=bridge`, and an rclone remote for `http://host.docker.internal:54321/storage/v1/s3` with the S3 keys from `supabase status`).
3. Run `restore.sh` against the empty stack (`RESTORE_DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:55322/postgres`, `RESTORE_STORAGE_REMOTE` pointing at port 55321).
4. Check that the row counts for `auth.users`, `auth.identities`, `public.users`, `accounts`, `transactions`, `categories` and `notifications` match the source, and that a test receipt file downloads from the restored bucket. In the 2026-11-16 test they matched; a second run gave the same result, and a run with a cut-off dump failed and left the target unchanged.

To test a real production backup the same way, copy one dated folder to the owner's own computer, restore it into the throwaway stack, compare the row counts, then run `supabase stop --no-backup` in the throwaway copy and delete the copied folder. It contains personal financial data: never commit it, share it, or load it into the development stack.

## Keeping Supabase awake

A daily cron on the server, `/etc/cron.d/budgetbuddy-keepalive`, calls `/api/health`. That route runs one small database query, which counts as activity so the free Supabase project is not paused.

The GitHub Actions `keep-alive.yml` workflow does the same job but cannot run while GitHub Actions is unavailable (account billing lock). The server cron does not depend on it.

## Access

Only the server owner has SSH access. Agents and contributors without access should hand server-side steps to the owner as exact commands.
