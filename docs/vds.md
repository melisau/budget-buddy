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

The default branch is `main`. The deploy files under `deploy/vds/` currently exist only on the server, not in this repository.

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

## Keeping Supabase awake

A daily cron on the server, `/etc/cron.d/budgetbuddy-keepalive`, calls `/api/health`. That route runs one small database query, which counts as activity so the free Supabase project is not paused.

The GitHub Actions `keep-alive.yml` workflow does the same job but cannot run while GitHub Actions is unavailable (account billing lock). The server cron does not depend on it.

## Access

Only the server owner has SSH access. Agents and contributors without access should hand server-side steps to the owner as exact commands.
