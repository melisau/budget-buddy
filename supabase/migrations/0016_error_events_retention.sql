-- Keep technical error reports for at most 90 days, as stated on the privacy
-- and account-deletion pages. Runs daily with pg_cron (available on all
-- Supabase plans). Idempotent: re-running replaces the job.

create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule(jobid) from cron.job where jobname = 'purge-old-error-events';

select cron.schedule(
  'purge-old-error-events',
  '23 3 * * *',
  $$delete from public.error_events where created_at < now() - interval '90 days'$$
);

-- Expired rate-limit windows are also cleaned up opportunistically by
-- check_rate_limit(); this keeps the table small even when traffic is low.
select cron.unschedule(jobid) from cron.job where jobname = 'purge-expired-rate-limits';

select cron.schedule(
  'purge-expired-rate-limits',
  '41 3 * * *',
  $$delete from public.rate_limit_buckets where reset_at < now() - interval '1 day'$$
);
