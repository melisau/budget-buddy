-- Repair production databases that still use a legacy users.plan constraint.
-- Billing state lives in subscription_plan; users.plan remains the product tier.

alter table public.users
  drop constraint if exists users_plan_check;

update public.users
set plan = 'free'
where plan is null
   or plan not in ('free', 'core', 'pro');

alter table public.users
  alter column plan set default 'free',
  alter column plan set not null;

alter table public.users
  add constraint users_plan_check
  check (plan in ('free', 'core', 'pro'));
