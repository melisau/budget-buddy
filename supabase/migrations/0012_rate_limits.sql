-- Shared, durable request rate limits.
--
-- Serverless instances do not share memory, so an in-process counter allows
-- every instance its own quota. This fixed-window counter lives in Postgres and
-- is updated atomically, so every instance sees the same count.

create table if not exists public.rate_limit_buckets (
  key text primary key check (char_length(key) between 1 and 200),
  count integer not null check (count >= 0),
  reset_at timestamptz not null
);

create index if not exists rate_limit_buckets_reset_idx
  on public.rate_limit_buckets(reset_at);

-- Browser roles never touch this table; only the server's service role does.
alter table public.rate_limit_buckets enable row level security;
revoke all on table public.rate_limit_buckets from public, anon, authenticated;

create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
  v_reset_at timestamptz;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate limit configuration';
  end if;

  -- Start a new window when the previous one has expired, otherwise count
  -- this request in the current window. The row lock serializes concurrent
  -- requests for the same key.
  insert into public.rate_limit_buckets as b (key, count, reset_at)
  values (p_key, 1, v_now + make_interval(secs => p_window_seconds))
  on conflict (key) do update
    set count = case when b.reset_at <= v_now then 1 else b.count + 1 end,
        reset_at = case
          when b.reset_at <= v_now then v_now + make_interval(secs => p_window_seconds)
          else b.reset_at
        end
  returning b.count, b.reset_at into v_count, v_reset_at;

  -- Opportunistically remove long-expired buckets so the table stays small.
  if random() < 0.01 then
    delete from public.rate_limit_buckets where reset_at < v_now - interval '1 day';
  end if;

  return query select
    v_count <= p_limit,
    greatest(1, ceil(extract(epoch from (v_reset_at - v_now)))::integer);
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
