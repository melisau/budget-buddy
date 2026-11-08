# VDS hosting

BudgetBuddy production (`budgetbuddy.melisauyar.com`) runs on a shared VDS, not on Vercel.

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

## Keeping Supabase awake

A daily cron on the server, `/etc/cron.d/budgetbuddy-keepalive`, calls `/api/health`. That route runs one small database query, which counts as activity so the free Supabase project is not paused.

The GitHub Actions `keep-alive.yml` workflow does the same job but cannot run while GitHub Actions is unavailable (account billing lock). The server cron does not depend on it.

## Access

Only the server owner has SSH access. Agents and contributors without access should hand server-side steps to the owner as exact commands.
