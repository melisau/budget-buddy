// Mobile clients authenticate with a Supabase access token in the Authorization
// header. Parsing only: the token is trusted after auth.getUser(token) verifies it.

export type BearerCredential = { kind: "none" } | { kind: "invalid" } | { kind: "token"; token: string };

const JWT_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const MAX_TOKEN_LENGTH = 8192;

/**
 * Other schemes count as "none", so cookie sessions keep working. A malformed
 * Bearer value is "invalid" and must fail closed, never fall back to a cookie.
 */
export function parseBearerCredential(header: string | null | undefined): BearerCredential {
  const value = header?.trim();
  if (!value || !/^bearer(\s|$)/i.test(value)) return { kind: "none" };
  const parts = value.split(/\s+/);
  if (parts.length !== 2) return { kind: "invalid" };
  const token = parts[1];
  if (token.length > MAX_TOKEN_LENGTH || !JWT_SHAPE.test(token)) return { kind: "invalid" };
  return { kind: "token", token };
}
