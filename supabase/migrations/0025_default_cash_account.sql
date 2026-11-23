-- Dashboard totals need an account's currency, so a transaction saved without an
-- account was invisible there. New transactions now fall back to the user's
-- oldest active TRY account, or to a "Nakit" account created on first use.
-- The function does no authorization: only the server role may call it, after
-- it has verified the acting user.

create or replace function public.ensure_default_account(p_user_id uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_account_id uuid;
begin
  -- Concurrent first transactions must not create two default accounts.
  perform pg_advisory_xact_lock(hashtextextended('default-account:' || p_user_id::text, 0));

  select id into v_account_id
  from public.accounts
  where user_id = p_user_id
    and family_group_id is null
    and archived_at is null
    and currency = 'TRY'
  order by created_at, id
  limit 1;

  if v_account_id is null then
    insert into public.accounts (user_id, name, type, currency)
    values (p_user_id, 'Nakit', 'cash', 'TRY')
    returning id into v_account_id;
  end if;

  return v_account_id;
end;
$$;

revoke all on function public.ensure_default_account(uuid) from public, anon, authenticated;
grant execute on function public.ensure_default_account(uuid) to service_role;

-- Repair only users who have never had any account. Rows of a user who has
-- accounts may have lost theirs on purpose, so their balances are left alone.
do $$
declare
  v_user_id uuid;
  v_account_id uuid;
begin
  for v_user_id in
    select distinct t.user_id
    from public.transactions t
    where t.account_id is null
      and not exists (select 1 from public.accounts a where a.user_id = t.user_id)
  loop
    v_account_id := public.ensure_default_account(v_user_id);
    update public.transactions
    set account_id = v_account_id
    where user_id = v_user_id and account_id is null;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
