-- Store the Stripe subscription lifecycle alongside the existing application plan.
alter table public.users
  add column if not exists subscription_plan text not null default 'free'
    check (subscription_plan in ('free', 'core', 'pro')),
  add column if not exists stripe_subscription_id text unique,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists subscription_ends_at timestamptz;

alter table public.users
  alter column subscription_status set default 'trialing',
  alter column trial_ends_at set default (now() + interval '14 days');

-- Existing users receive the same full-access trial as new registrations.
update public.users
set subscription_status = 'trialing',
    trial_ends_at = coalesce(trial_ends_at, now() + interval '14 days')
where subscription_status = 'inactive';

alter table public.billing_invoices
  add column if not exists stripe_subscription_id text,
  add column if not exists paid_at timestamptz,
  add column if not exists period_end timestamptz;

create index if not exists billing_invoices_user_created_idx
  on public.billing_invoices(user_id, created_at desc);

alter table public.billing_invoices enable row level security;
