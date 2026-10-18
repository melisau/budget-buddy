# Moving Clerk to production

The live site still uses a Clerk **Development** instance (`pk_test_…`). It
works, but shows a "Development mode" badge, has user limits and uses Clerk's
shared OAuth credentials. A **Production** instance needs a domain you own.

## 1. Get a domain and connect it to Vercel

1. Buy a domain from any registrar (e.g. `budgetbuddy.app`, `budgetbuddy.com.tr`).
2. Vercel → `budget-buddy-app` → **Settings → Domains → Add**, enter the domain
   and add the DNS records Vercel shows at your registrar.
3. Vercel → **Settings → Environment Variables** (Production):
   `NEXT_PUBLIC_SITE_URL=https://<your-domain>` (canonical URL, sitemap, robots).
4. GitHub → **Settings → Secrets and variables → Actions → Variables**:
   `HEALTH_CHECK_URL=https://<your-domain>/api/health` (daily keep-alive).

## 2. Create the Clerk production instance

1. Clerk Dashboard → instance switcher → **Create production instance**, clone
   the development settings, enter the domain from step 1.
2. **Domains**: add the DNS records Clerk lists at your registrar and wait until
   all show as verified (can take up to 48 hours). The app already proxies
   Clerk's Frontend API through `/__clerk` (`frontendApiProxy` in `proxy.ts`).
3. **Social sign-in**: for every provider enabled (e.g. Google), create your
   own OAuth client and paste its credentials into Clerk; production does not
   use Clerk's shared credentials.
4. Paths, SSO connections and integrations are not copied: re-check them.

## 3. Existing users — read before switching keys

Production has its **own user list**; development users are not moved. Our
`public.users` rows are keyed by `clerk_user_id`, so an existing user who signs
up again in production gets a new Clerk ID and, without the step below, a new
empty Budget Buddy account. Their old data stays in the database, unlinked.

Do **not** relink automatically by email. Relink each person deliberately:

1. Before switching, list current users (Supabase SQL Editor):
   ```sql
   select id, email, clerk_user_id, created_at from public.users order by created_at;
   ```
2. After switching, the person signs up in production with the **same email**
   and verifies it. Their first visit creates a new, empty row.
3. Confirm with the person that both accounts are theirs, then run, replacing
   the email, in one transaction:
   ```sql
   begin;
   -- the newest row for this email is the new production sign-up
   with new_row as (
     select id, clerk_user_id from public.users
     where lower(email) = lower('person@example.com')
     order by created_at desc limit 1
   ), old_row as (
     select id from public.users
     where lower(email) = lower('person@example.com')
     order by created_at asc limit 1
   )
   select (select id from old_row) as keep_id,
          (select id from new_row) as remove_id,
          (select clerk_user_id from new_row) as new_clerk_id;
   -- check the three values above, then:
   -- delete from public.users where id = '<remove_id>';           -- removes the empty starter account
   -- update public.users set clerk_user_id = '<new_clerk_id>' where id = '<keep_id>';
   commit;
   ```
   Deleting the new row cascades only to its fresh starter data. Do the
   `delete` before the `update` (clerk_user_id is unique).

If nobody but you has real data, you can instead start everyone fresh.

## 4. Switch the keys

1. Clerk Production → **API keys**: copy `pk_live_…` and `sk_live_…`.
2. Vercel (Production only):
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = `pk_live_…` (Config)
   - `CLERK_SECRET_KEY` = `sk_live_…` (Secret)
   Keep the development keys in Preview/Development.
3. Redeploy production. Changing `CLERK_SECRET_KEY` also rotates the signing
   key for the proxy identity header automatically.

## 5. Verify

- Sign-up, email verification, sign-in, sign-out, password reset.
- No "Development mode" badge; the browser loads Clerk from your domain.
- Dashboard loads; adding a transaction works.
- `https://<your-domain>/api/health` returns `{"ok":true}`.
- Sentry shows no new errors.

Rollback: put the development keys back in Vercel and redeploy.
