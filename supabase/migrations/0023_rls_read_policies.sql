-- Row-level read policies (defense in depth). Idempotent.
--
-- Server routes still enforce every rule in TypeScript and use the server-only
-- privileged client, which bypasses RLS. These policies make the database apply
-- the same read rules to any request made with a user's own session (the
-- `authenticated` role), so a missed check in a route that uses a user-scoped
-- client, or a direct table request from the browser, cannot expose another
-- user's data.
--
-- Scope: SELECT only. There are no INSERT/UPDATE/DELETE policies, so writes
-- stay denied to `authenticated` and remain server-only, where roles, the
-- "own name" rule for family transactions and atomic gift reservations live.
--
-- Deliberately without a policy (server-only):
--   wishlist_items     - surprise mode hides reservation columns from the list
--                        owner; RLS filters rows, not columns, so it cannot
--                        express that rule.
--   error_events, rate_limit_buckets - operational data.
begin;

-- Some environments never ran optional migrations (for example 0005/0006
-- billing while payments are switched off). Policies are created only for
-- tables that exist, so this migration runs everywhere.
create or replace function pg_temp.select_policy(p_table text, p_name text, p_using text)
returns void language plpgsql as $fn$
begin
  if to_regclass(format('public.%I', p_table)) is null then
    raise notice 'Skipping policy %: table public.% does not exist', p_name, p_table;
    return;
  end if;
  execute format('drop policy if exists %I on public.%I', p_name, p_table);
  execute format('create policy %I on public.%I for select to authenticated using (%s)', p_name, p_table, p_using);
end
$fn$;

-- The app user (public.users.id) behind the current Supabase Auth session.
create or replace function public.current_app_user_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select u.id from public.users u where u.auth_user_id = auth.uid()
$$;

-- Accepted membership check. SECURITY DEFINER so policies on family_members
-- can use it without recursing into their own policy.
create or replace function public.is_accepted_family_member(p_user_id uuid, p_family_group_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_user_id is not null and p_family_group_id is not null and exists (
    select 1 from public.family_members m
    where m.family_group_id = p_family_group_id
      and m.user_id = p_user_id
      and m.invitation_status = 'accepted'
  )
$$;

revoke all on function public.current_app_user_id() from public, anon;
revoke all on function public.is_accepted_family_member(uuid, uuid) from public, anon;
grant execute on function public.current_app_user_id() to authenticated, service_role;
grant execute on function public.is_accepted_family_member(uuid, uuid) to authenticated, service_role;

-- Own row and own personal data.
select pg_temp.select_policy('users', 'users_select_own', $p$id = (select public.current_app_user_id())$p$);

do $$
declare
  t text;
begin
  foreach t in array array[
    'accounts', 'categories', 'budgets', 'goals', 'ai_sessions', 'billing_invoices',
    'allowance_plans', 'notifications', 'recurring_items', 'category_rules'
  ] loop
    perform pg_temp.select_policy(t, t || '_select_own', 'user_id = (select public.current_app_user_id())');
  end loop;
end $$;

-- Transactions: mirrors requireTransactionReadAccess in lib/auth/authorization.ts.
-- Personal rows only to their owner; family rows to accepted group members.
select pg_temp.select_policy('transactions', 'transactions_select_visible', $p$case
      when family_group_id is null then user_id = (select public.current_app_user_id())
      else public.is_accepted_family_member((select public.current_app_user_id()), family_group_id)
    end$p$);

-- Family groups and their shared lists: accepted members only.
select pg_temp.select_policy('family_groups', 'family_groups_select_member', $p$public.is_accepted_family_member((select public.current_app_user_id()), id)$p$);

select pg_temp.select_policy('family_shopping_notes', 'family_shopping_notes_select_member', $p$public.is_accepted_family_member((select public.current_app_user_id()), family_group_id)$p$);

select pg_temp.select_policy('family_shopping_items', 'family_shopping_items_select_member', $p$public.is_accepted_family_member((select public.current_app_user_id()), family_group_id)$p$);

-- Membership rows: your own row (also a pending invitation), plus the accepted
-- members of groups you belong to. Pending invitations of others, which hold
-- invited e-mail addresses, stay hidden.
select pg_temp.select_policy('family_members', 'family_members_select_visible', $p$user_id = (select public.current_app_user_id())
    or (
      invitation_status = 'accepted'
      and public.is_accepted_family_member((select public.current_app_user_id()), family_group_id)
    )$p$);

-- Goal shares (goal ID + group only; goals themselves stay owner-only). Shares
-- of someone who left the group are no longer returned, as in the API.
select pg_temp.select_policy('goal_shares', 'goal_shares_select_member', $p$public.is_accepted_family_member((select public.current_app_user_id()), family_group_id)
    and public.is_accepted_family_member(shared_by_user_id, family_group_id)$p$);

-- Wishlists: the owner, or accepted members of the list's group while the
-- owner is still a member. Items (and reservations) stay server-only.
select pg_temp.select_policy('wishlists', 'wishlists_select_visible', $p$owner_user_id = (select public.current_app_user_id())
    or (
      family_group_id is not null
      and public.is_accepted_family_member((select public.current_app_user_id()), family_group_id)
      and public.is_accepted_family_member(owner_user_id, family_group_id)
    )$p$);

commit;
