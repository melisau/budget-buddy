-- Account lifecycle and internal transfers for BB-07.

alter table public.accounts
  add column if not exists archived_at timestamptz;

alter table public.transactions
  add column if not exists transfer_group_id uuid;

create index if not exists accounts_active_user_idx
  on public.accounts(user_id, archived_at, created_at desc);

create index if not exists transactions_transfer_group_idx
  on public.transactions(transfer_group_id)
  where transfer_group_id is not null;
