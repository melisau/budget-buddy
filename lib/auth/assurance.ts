// Two-step verification (Supabase Auth MFA, TOTP). A password or Google
// sign-in yields an "aal1" session; entering the authenticator code upgrades
// it to "aal2". Pure helpers, shared by the server check and its tests.

export type AssuranceLevel = "aal1" | "aal2";
type FactorLike = { status?: unknown };

/**
 * Reads the `aal` claim of an access token. Call it only with a token the
 * Auth server has just verified (auth.getUser()); this does not check the
 * signature. Anything unreadable counts as no level at all.
 */
export function accessTokenAssuranceLevel(token: string | null | undefined): AssuranceLevel | null {
  const segment = token?.split(".")[1];
  if (!segment) return null;
  try {
    const json = Buffer.from(segment.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const aal = (JSON.parse(json) as { aal?: unknown }).aal;
    return aal === "aal1" || aal === "aal2" ? aal : null;
  } catch {
    return null;
  }
}

export function hasVerifiedFactor(factors: readonly FactorLike[] | null | undefined): boolean {
  return (factors ?? []).some((factor) => factor.status === "verified");
}

/**
 * True when the account has two-step verification turned on but this session
 * has not passed it yet. Fails closed: a missing or unreadable level on an
 * account with a verified factor is treated as pending.
 */
export function secondStepPending(factors: readonly FactorLike[] | null | undefined, token: string | null | undefined): boolean {
  return hasVerifiedFactor(factors) && accessTokenAssuranceLevel(token) !== "aal2";
}
