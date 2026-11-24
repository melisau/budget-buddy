-- One page of the transactions a user can see: their own, plus those of family
-- groups where they are an accepted member. Keyset paging on
-- (transaction_date, created_at, id), newest first. No authorization here: only
-- the server role may call it, with the verified user's ID.

create index if not exists transactions_user_page_idx
  on public.transactions(user_id, transaction_date desc, created_at desc, id desc);
create index if not exists transactions_family_page_idx
  on public.transactions(family_group_id, transaction_date desc, created_at desc, id desc)
  where family_group_id is not null;

create or replace function public.list_transactions_page(
  p_user_id uuid,
  p_limit integer,
  p_before_date date default null,
  p_before_created timestamptz default null,
  p_before_id uuid default null,
  p_query text default null
)
returns jsonb
language sql
stable
set search_path = public
as $$
  with families as (
    select family_group_id from public.family_members
    where user_id = p_user_id and invitation_status = 'accepted'
  ),
  page as (
    select t.*
    from public.transactions t
    where (t.user_id = p_user_id or t.family_group_id in (select family_group_id from families))
      and (
        p_before_date is null
        or (t.transaction_date, t.created_at, t.id) < (p_before_date, p_before_created, p_before_id)
      )
      and (
        p_query is null
        or t.title ilike '%' || replace(replace(replace(p_query, '\', '\\'), '%', '\%'), '_', '\_') || '%' escape '\'
      )
    order by t.transaction_date desc, t.created_at desc, t.id desc
    limit least(greatest(p_limit, 1), 101)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'type', p.type,
    'amount', p.amount,
    'title', p.title,
    'note', p.note,
    'transaction_date', p.transaction_date,
    'created_at', p.created_at,
    'family_group_id', p.family_group_id,
    'owner_user_id', p.owner_user_id,
    'created_by_user_id', p.created_by_user_id,
    'receipt_path', p.receipt_path,
    'receipt_content_type', p.receipt_content_type,
    'account', case when a.id is null then null else jsonb_build_object('id', a.id, 'name', a.name) end,
    'category', case when c.id is null then null else jsonb_build_object('id', c.id, 'name', c.name) end
  ) order by p.transaction_date desc, p.created_at desc, p.id desc), '[]'::jsonb)
  from page p
  left join public.accounts a on a.id = p.account_id
  left join public.categories c on c.id = p.category_id;
$$;

revoke all on function public.list_transactions_page(uuid, integer, date, timestamptz, uuid, text) from public, anon, authenticated;
grant execute on function public.list_transactions_page(uuid, integer, date, timestamptz, uuid, text) to service_role;

notify pgrst, 'reload schema';
