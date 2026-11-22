-- Dashboard totals computed in the database, so a request no longer reads every
-- transaction. These functions take a user or family ID and do no authorization:
-- only the server role may call them, after it has verified the acting user.

create or replace function public.dashboard_family_accounts(p_family_group_id uuid)
returns table (id uuid, name text, currency text)
language sql
stable
set search_path = public
as $$
  select distinct a.id, a.name, a.currency
  from public.transactions t
  join public.accounts a on a.id = t.account_id
  where t.family_group_id = p_family_group_id
  order by a.name, a.id;
$$;

create or replace function public.dashboard_totals(
  p_user_id uuid,
  p_family_group_id uuid,
  p_account_id uuid,
  p_currency text,
  p_month_start date,
  p_month_end date,
  p_flow_start date
)
returns jsonb
language sql
stable
set search_path = public
as $$
  with scoped as (
    select t.type, t.amount, t.transaction_date, t.category_id
    from public.transactions t
    join public.accounts a on a.id = t.account_id
    where a.currency = p_currency
      and t.transaction_date <= p_month_end
      and (p_account_id is null or t.account_id = p_account_id)
      and (
        (p_family_group_id is null and t.user_id = p_user_id and t.family_group_id is null)
        or (p_family_group_id is not null and t.family_group_id = p_family_group_id)
      )
  ),
  category_totals as (
    select coalesce(c.name, 'Uncategorized') as name, sum(s.amount) as value
    from scoped s
    left join public.categories c on c.id = s.category_id
    where s.type = 'expense' and s.transaction_date >= p_month_start
    group by 1
  ),
  flow as (
    select
      to_char(transaction_date, 'YYYY-MM') as month,
      coalesce(sum(amount) filter (where type = 'income'), 0) as income,
      coalesce(sum(amount) filter (where type = 'expense'), 0) as expense
    from scoped
    where transaction_date >= p_flow_start
    group by 1
  )
  select jsonb_build_object(
    'balance', (select coalesce(sum(case when type = 'income' then amount else -amount end), 0) from scoped),
    'income', (select coalesce(sum(amount), 0) from scoped where type = 'income' and transaction_date >= p_month_start),
    'expenses', (select coalesce(sum(amount), 0) from scoped where type = 'expense' and transaction_date >= p_month_start),
    'categories', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'value', value) order by value desc, name), '[]'::jsonb) from category_totals),
    'cashFlow', (select coalesce(jsonb_agg(jsonb_build_object('month', month, 'income', income, 'expense', expense) order by month), '[]'::jsonb) from flow)
  );
$$;

revoke all on function public.dashboard_family_accounts(uuid) from public, anon, authenticated;
revoke all on function public.dashboard_totals(uuid, uuid, uuid, text, date, date, date) from public, anon, authenticated;
grant execute on function public.dashboard_family_accounts(uuid) to service_role;
grant execute on function public.dashboard_totals(uuid, uuid, uuid, text, date, date, date) to service_role;

notify pgrst, 'reload schema';
