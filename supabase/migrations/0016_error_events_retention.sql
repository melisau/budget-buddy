-- Keep technical error reports for at most 90 days, as stated on the privacy
-- and account-deletion pages, and clear expired rate-limit rows. Runs daily
-- with pg_cron, which every Supabase project provides. Idempotent: re-running
-- replaces the jobs. Databases without pg_cron (local/in-memory test
-- databases) skip this migration with a notice instead of failing.

do $migration$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise notice 'pg_cron is not available; retention jobs were not scheduled.';
    return;
  end if;

  execute 'create extension if not exists pg_cron with schema pg_catalog';

  perform cron.unschedule(jobid) from cron.job
    where jobname in ('purge-old-error-events', 'purge-expired-rate-limits');

  perform cron.schedule(
    'purge-old-error-events',
    '23 3 * * *',
    $job$delete from public.error_events where created_at < now() - interval '90 days'$job$
  );

  perform cron.schedule(
    'purge-expired-rate-limits',
    '41 3 * * *',
    $job$delete from public.rate_limit_buckets where reset_at < now() - interval '1 day'$job$
  );
end;
$migration$;
