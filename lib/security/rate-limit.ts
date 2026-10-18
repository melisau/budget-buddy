import { getSupabaseServerClient } from "@/lib/supabase/server";

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

/**
 * Shared rate limit backed by the `check_rate_limit` Postgres function
 * (migration 0012), so every serverless instance counts against one quota.
 *
 * If the database call fails (for example before the migration is applied),
 * the request is limited by a per-instance in-memory counter instead. That is
 * weaker but keeps the app available, and the failure is logged so it gets
 * fixed rather than silently ignored.
 */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1_000));
  try {
    const { data, error } = await getSupabaseServerClient().rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    const row = (Array.isArray(data) ? data[0] : data) as { allowed?: unknown; retry_after_seconds?: unknown } | null;
    if (!row || typeof row.allowed !== "boolean") throw new Error("Unexpected rate limit response.");
    return {
      allowed: row.allowed,
      retryAfterSeconds: typeof row.retry_after_seconds === "number" ? row.retry_after_seconds : windowSeconds,
    };
  } catch (error) {
    console.error("[rate-limit] shared limiter unavailable, using in-memory fallback", error instanceof Error ? error.message : error);
    return checkMemoryRateLimit(key, limit, windowMs);
  }
}

const buckets = new Map<string, { count: number; resetAt: number }>();

/** Per-instance fallback. Exported for tests. */
export function checkMemoryRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: Math.ceil(windowMs / 1_000) };
  }
  if (existing.count >= limit) return { allowed: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1_000) };
  existing.count += 1;
  return { allowed: true, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1_000) };
}
