-- Payment reminders for recurring items.
-- Additive: one nullable column and a wider notification kind check.
--
-- reminder_days null  → no reminder; the transaction is created automatically
--                       on its date (the behavior before this migration).
-- reminder_days 0/1/3/7 → remind that many days before the date and wait for
--                       the user to mark the payment as paid or skipped.
alter table public.recurring_items
  add column if not exists reminder_days smallint
  check (reminder_days is null or reminder_days in (0, 1, 3, 7));

-- The inline check from 0019 has the default name notifications_kind_check.
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('budget_warning', 'budget_exceeded', 'goal_due', 'family_invite', 'recurring_due'));
