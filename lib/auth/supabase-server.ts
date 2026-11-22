import "server-only";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { secondStepPending } from "@/lib/auth/assurance";
import { createSupabaseAuthClient, readBearerCredential } from "@/lib/supabase/auth-server";
import { readSupabasePublicConfig } from "@/lib/supabase/config";

export type AuthState = { user: User | null; secondStepPending: boolean };

// Verify with Auth, including deleted/banned accounts. Do not trust getSession
// or browser-supplied identity headers for authorization.
export const getAuthState = cache(async (): Promise<AuthState> => {
  const signedOut = { user: null, secondStepPending: false };
  if (!readSupabasePublicConfig()) return signedOut;
  const bearer = await readBearerCredential();
  if (bearer.kind === "invalid") return signedOut;
  const client = await createSupabaseAuthClient();
  // A mobile token is verified here too; a rejected token never falls back to a cookie.
  const { data, error } = bearer.kind === "token" ? await client.auth.getUser(bearer.token) : await client.auth.getUser();
  if (error || !data.user || !data.user.email_confirmed_at) return signedOut;
  // getUser() verified this token with the Auth server, so its aal claim can
  // be read; the factor list comes from the same verified response.
  const accessToken = bearer.kind === "token" ? bearer.token : (await client.auth.getSession()).data.session?.access_token;
  return { user: data.user, secondStepPending: secondStepPending(data.user.factors, accessToken) };
});

// The user for every protected page and API route. An account with two-step
// verification is not signed in until the session has passed the second step.
export const getCurrentUser = cache(async () => {
  const state = await getAuthState();
  return state.secondStepPending ? null : state.user;
});
