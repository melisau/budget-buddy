import "server-only";
import { cache } from "react";
import { createSupabaseAuthClient } from "@/lib/supabase/auth-server";

// Verify with Auth, including deleted/banned accounts. Do not trust getSession
// or browser-supplied identity headers for authorization.
export const getCurrentUser = cache(async () => {
  const client = await createSupabaseAuthClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user || !data.user.email_confirmed_at) return null;
  return data.user;
});
