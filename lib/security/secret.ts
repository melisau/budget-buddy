import { createHash, timingSafeEqual } from "node:crypto";

/** Compares two secrets in constant time, whatever their lengths. */
export function secretsMatch(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** True when the request carries `Authorization: Bearer <secret>` for a long enough secret. */
export function hasValidBearerSecret(request: Request, secret: string | undefined): boolean {
  if (!secret || secret.length < 16) return false;
  return secretsMatch(request.headers.get("authorization") ?? "", `Bearer ${secret}`);
}
