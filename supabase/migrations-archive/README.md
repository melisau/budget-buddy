# Archived migrations — do not apply

These files belong to the Supabase Auth cutover (PR #2) that was reverted in
PR #4. The application authenticates with **Clerk**, so new environments must
not run them.

| File | What it did |
| --- | --- |
| `0010_supabase_auth.sql` | Made `users.clerk_user_id` nullable, added `users.auth_user_id`, added `link_legacy_auth_user()` and a browser-callable `sync_authenticated_user()`. |
| `0011_family_collaboration.sql` | Added tables for removed features (goal shares, allowance plans, shopping lists, wishlists) and replaced `sync_authenticated_user()`. |
| `supabase-auth-migration.md` | The cutover runbook. |

If a database already ran them, nothing breaks under Clerk: the extra column and
tables are unused and empty. Migration `0013_disable_supabase_auth_leftovers.sql`
(in the live folder) closes the leftover browser-callable function either way.
Dropping the unused column/tables is a separate, deliberate decision; never do
it without a backup.

Check whether a database ran them (Supabase SQL Editor):

```sql
select
  exists (select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'users' and column_name = 'auth_user_id') as ran_0010,
  to_regclass('public.wishlists') is not null as ran_0011;
```

If the Supabase Auth cutover is resumed later, bring these back as new,
higher-numbered migrations written against the schema at that time.
