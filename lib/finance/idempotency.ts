const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** The optional `Idempotency-Key` header: a UUID, absent (null), or "invalid". */
export function readIdempotencyKey(headers: Headers): string | null | "invalid" {
  const value = headers.get("idempotency-key")?.trim();
  if (!value) return null;
  return uuid.test(value) ? value.toLowerCase() : "invalid";
}

type Comparable = { type: string; amount: number | string; title: string; transaction_date: string };

/** A replay must describe the same transaction; a reused key with other data is a client bug. */
export function isSameTransaction(stored: Comparable, requested: { type: string; amount: number; title: string; date: string }) {
  return stored.type === requested.type
    && Math.abs(Number(stored.amount) - requested.amount) < 0.005
    && stored.title === requested.title
    && stored.transaction_date === requested.date;
}
