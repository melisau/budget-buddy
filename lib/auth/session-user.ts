import "server-only";
import { cache } from "react";
import { decideSession, type SessionAccount } from "@/lib/auth/session-decision";
import { createSupabaseAuthClient, readBearerCredential } from "@/lib/supabase/auth-server";
import { readSupabasePublicConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type SessionResult =
  | { kind: "signed-out" }
  | { kind: "needs-app-user" }
  | { kind: "ok"; appUser: { id: string; authUserId: string; email: string | null; name: string | null } }
  | { kind: "unavailable" };

/**
 * The fast path for API routes: the access token's signature is checked
 * locally against the project's cached public keys, then one database call
 * reads the live account state and app user. "unavailable" means the database
 * function is missing, and the caller falls back to the Auth server check.
 */
export const readSessionUser = cache(async (): Promise<SessionResult> => {
  if (!readSupabasePublicConfig()) return { kind: "signed-out" };
  const bearer = await readBearerCredential();
  if (bearer.kind === "invalid") return { kind: "signed-out" };
  const client = await createSupabaseAuthClient();
  // A mobile token is checked on its own; a rejected token never falls back to a cookie.
  const { data, error } = bearer.kind === "token" ? await client.auth.getClaims(bearer.token) : await client.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return { kind: "signed-out" };

  const state = await getSupabaseServerClient().rpc("app_session_user", { p_auth_user_id: claims.sub });
  if (state.error?.code === "PGRST202") return { kind: "unavailable" };
  if (state.error) throw new Error(`Unable to check the signed-in account: ${state.error.message}`);
  return decideSession(state.data as SessionAccount, claims.aal);
});
