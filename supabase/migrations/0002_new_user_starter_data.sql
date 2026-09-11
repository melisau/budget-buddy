-- Create a small, private starter dataset exactly once for each Clerk user.
-- The function is callable only with Supabase's server-side service role.

alter table public.users
add column if not exists starter_data_seeded_at timestamptz;

create or replace function public.seed_user_starter_data(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seeded_at timestamptz;
  v_everyday_account_id uuid;
  v_savings_account_id uuid;
  v_cash_account_id uuid;
  v_salary_category_id uuid;
  v_housing_category_id uuid;
  v_groceries_category_id uuid;
  v_dining_category_id uuid;
begin
  -- Serialize simultaneous first-page requests for the same user.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  select starter_data_seeded_at
  into v_seeded_at
  from public.users
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Cannot seed starter data for an unknown user';
  end if;

  if v_seeded_at is not null then
    return false;
  end if;

  -- Do not mix starter rows into an existing user's real records. This also
  -- makes the migration safe for users created before this feature shipped.
  if exists (select 1 from public.accounts where user_id = p_user_id)
    or exists (select 1 from public.categories where user_id = p_user_id)
    or exists (select 1 from public.transactions where user_id = p_user_id)
  then
    update public.users
    set starter_data_seeded_at = now()
    where id = p_user_id;
    return false;
  end if;

  insert into public.accounts (
    user_id,
    name,
    type,
    currency,
    initial_balance
  ) values (
    p_user_id,
    'Everyday account',
    'checking',
    'TRY',
    5000
  ) returning id into v_everyday_account_id;

  insert into public.accounts (
    user_id,
    name,
    type,
    currency,
    initial_balance
  ) values (
    p_user_id,
    'Savings',
    'savings',
    'TRY',
    25000
  ) returning id into v_savings_account_id;

  insert into public.accounts (
    user_id,
    name,
    type,
    currency,
    initial_balance
  ) values (
    p_user_id,
    'Cash wallet',
    'cash',
    'TRY',
    750
  ) returning id into v_cash_account_id;

  insert into public.categories (user_id, name, type, icon)
  values (p_user_id, 'Salary', 'income', 'wallet-cards')
  returning id into v_salary_category_id;

  insert into public.categories (user_id, name, type, icon)
  values (p_user_id, 'Housing', 'expense', 'house')
  returning id into v_housing_category_id;

  insert into public.categories (user_id, name, type, icon)
  values (p_user_id, 'Groceries', 'expense', 'shopping-basket')
  returning id into v_groceries_category_id;

  insert into public.categories (user_id, name, type, icon)
  values (p_user_id, 'Dining', 'expense', 'utensils')
  returning id into v_dining_category_id;

  insert into public.transactions (
    user_id,
    owner_user_id,
    created_by_user_id,
    account_id,
    category_id,
    type,
    amount,
    title,
    note,
    transaction_date
  ) values
    (
      p_user_id,
      p_user_id,
      p_user_id,
      v_everyday_account_id,
      v_salary_category_id,
      'income',
      55000,
      'Salary',
      'Starter transaction',
      current_date - 10
    ),
    (
      p_user_id,
      p_user_id,
      p_user_id,
      v_everyday_account_id,
      v_housing_category_id,
      'expense',
      14500,
      'Rent payment',
      'Starter transaction',
      current_date - 9
    ),
    (
      p_user_id,
      p_user_id,
      p_user_id,
      v_everyday_account_id,
      v_groceries_category_id,
      'expense',
      1850,
      'Migros Market',
      'Starter transaction',
      current_date - 4
    ),
    (
      p_user_id,
      p_user_id,
      p_user_id,
      v_cash_account_id,
      v_dining_category_id,
      'expense',
      180,
      'Coffee Shop',
      'Starter transaction',
      current_date - 1
    );

  update public.users
  set starter_data_seeded_at = now()
  where id = p_user_id;

  return true;
end;
$$;

revoke all on function public.seed_user_starter_data(uuid) from public;
revoke all on function public.seed_user_starter_data(uuid) from anon;
revoke all on function public.seed_user_starter_data(uuid) from authenticated;
grant execute on function public.seed_user_starter_data(uuid) to service_role;
