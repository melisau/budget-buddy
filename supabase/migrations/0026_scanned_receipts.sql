-- Receipt contents stored as structured data. The photo and raw OCR text stay on
-- the phone. The save function does no user authentication: only the server role
-- may call it, with the verified user's ID.

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  transaction_id uuid not null unique references public.transactions(id) on delete cascade,
  client_scan_id uuid not null,
  merchant text check (merchant is null or char_length(merchant) between 1 and 160),
  receipt_date date not null,
  currency text not null default 'TRY' check (currency = 'TRY'),
  total numeric(14, 2) not null check (total > 0),
  tax numeric(14, 2) check (tax is null or (tax >= 0 and tax <= total)),
  parser_version integer not null check (parser_version between 1 and 1000),
  merchant_edited boolean not null default false,
  date_edited boolean not null default false,
  total_edited boolean not null default false,
  tax_edited boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, client_scan_id)
);

create table if not exists public.receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  position integer not null check (position between 0 and 99),
  name text not null check (char_length(name) between 1 and 120),
  quantity numeric(10, 3) not null check (quantity > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  line_total numeric(14, 2) not null check (line_total >= 0),
  unique (receipt_id, position)
);

create index if not exists receipts_user_created_idx on public.receipts(user_id, created_at desc);

alter table public.receipts enable row level security;
alter table public.receipt_items enable row level security;

drop policy if exists receipts_select_own on public.receipts;
create policy receipts_select_own on public.receipts for select to authenticated
  using (user_id = (select public.current_app_user_id()));

drop policy if exists receipt_items_select_own on public.receipt_items;
create policy receipt_items_select_own on public.receipt_items for select to authenticated
  using (exists (
    select 1 from public.receipts r
    where r.id = receipt_id and r.user_id = (select public.current_app_user_id())
  ));

revoke insert, update, delete on public.receipts, public.receipt_items from anon, authenticated;

create or replace function public.save_scanned_receipt(
  p_user_id uuid,
  p_account_id uuid,
  p_category_id uuid,
  p_title text,
  p_receipt jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_scan_id uuid := (p_receipt ->> 'scanId')::uuid;
  v_total numeric(14, 2) := (p_receipt ->> 'total')::numeric;
  v_date date := (p_receipt ->> 'date')::date;
  v_account_id uuid := p_account_id;
  v_transaction_id uuid;
  v_receipt_id uuid;
begin
  -- A retry after a lost response returns the first result instead of a duplicate.
  perform pg_advisory_xact_lock(hashtextextended('receipt-scan:' || p_user_id::text || ':' || v_scan_id::text, 0));
  select transaction_id into v_transaction_id
  from public.receipts where user_id = p_user_id and client_scan_id = v_scan_id;
  if v_transaction_id is not null then
    return v_transaction_id;
  end if;

  if not exists (
    select 1 from public.categories
    where id = p_category_id and user_id = p_user_id and type = 'expense'
  ) then
    raise exception 'receipt_reference_invalid';
  end if;
  if v_account_id is null then
    v_account_id := public.ensure_default_account(p_user_id);
  elsif not exists (select 1 from public.accounts where id = v_account_id and user_id = p_user_id) then
    raise exception 'receipt_reference_invalid';
  end if;

  insert into public.transactions (
    user_id, owner_user_id, created_by_user_id, account_id, category_id,
    type, amount, title, transaction_date
  ) values (
    p_user_id, p_user_id, p_user_id, v_account_id, p_category_id,
    'expense', v_total, p_title, v_date
  ) returning id into v_transaction_id;

  insert into public.receipts (
    user_id, transaction_id, client_scan_id, merchant, receipt_date, total, tax,
    parser_version, merchant_edited, date_edited, total_edited, tax_edited
  ) values (
    p_user_id, v_transaction_id, v_scan_id, nullif(p_receipt ->> 'merchant', ''), v_date, v_total,
    (p_receipt ->> 'tax')::numeric, (p_receipt ->> 'parserVersion')::integer,
    coalesce((p_receipt #>> '{edited,merchant}')::boolean, false),
    coalesce((p_receipt #>> '{edited,date}')::boolean, false),
    coalesce((p_receipt #>> '{edited,total}')::boolean, false),
    coalesce((p_receipt #>> '{edited,tax}')::boolean, false)
  ) returning id into v_receipt_id;

  insert into public.receipt_items (receipt_id, position, name, quantity, unit_price, line_total)
  select v_receipt_id, (item.ordinality - 1)::integer, item.value ->> 'name',
    (item.value ->> 'quantity')::numeric, (item.value ->> 'unitPrice')::numeric,
    (item.value ->> 'lineTotal')::numeric
  from jsonb_array_elements(coalesce(p_receipt -> 'items', '[]'::jsonb)) with ordinality as item(value, ordinality);

  return v_transaction_id;
end;
$$;

revoke all on function public.save_scanned_receipt(uuid, uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.save_scanned_receipt(uuid, uuid, uuid, text, jsonb) to service_role;

notify pgrst, 'reload schema';
