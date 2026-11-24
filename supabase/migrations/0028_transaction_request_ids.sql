-- Lets a client retry a transaction create safely: the same user and request ID
-- can store only one transaction. Additive; older clients send no request ID.

alter table public.transactions add column if not exists client_request_id uuid;

create unique index if not exists transactions_client_request_idx
  on public.transactions(user_id, client_request_id)
  where client_request_id is not null;

notify pgrst, 'reload schema';
