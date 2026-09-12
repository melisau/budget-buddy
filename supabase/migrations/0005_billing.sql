alter table public.users add column if not exists stripe_customer_id text unique;
alter table public.users add column if not exists subscription_status text not null default 'inactive';
create table if not exists public.billing_invoices (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade, stripe_invoice_id text unique not null, amount_paid numeric(14,2) not null, currency text not null, status text not null, invoice_url text, created_at timestamptz not null default now());
