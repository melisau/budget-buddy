export type SessionAccount = {
  confirmed: boolean;
  banned: boolean;
  hasVerifiedFactor: boolean;
  appUser: { id: string; authUserId: string; email: string | null; name: string | null } | null;
} | null;

export type SessionDecision =
  | { kind: "signed-out" }
  | { kind: "needs-app-user" }
  | { kind: "ok"; appUser: NonNullable<NonNullable<SessionAccount>["appUser"]> };

/**
 * Decides access from a token whose signature was verified and the account's
 * live state. Fails closed: a missing account, an unconfirmed or banned one,
 * or two-step verification not passed in this session means signed out.
 */
export function decideSession(account: SessionAccount, aal: unknown): SessionDecision {
  if (!account || !account.confirmed || account.banned) return { kind: "signed-out" };
  if (account.hasVerifiedFactor && aal !== "aal2") return { kind: "signed-out" };
  if (!account.appUser) return { kind: "needs-app-user" };
  return { kind: "ok", appUser: account.appUser };
}
