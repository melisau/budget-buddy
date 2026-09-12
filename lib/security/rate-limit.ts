type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: Math.ceil(windowMs / 1_000) };
  }
  if (existing.count >= limit) return { allowed: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1_000) };
  existing.count += 1;
  return { allowed: true, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1_000) };
}
