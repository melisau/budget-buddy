import "server-only";
import { cache } from "react";
import { createSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { readSupabasePublicConfig } from "@/lib/supabase/config";

// Verify with Auth, including deleted/banned accounts. Do not trust getSession
// or browser-supplied identity headers for authorization.
export const getCurrentUser = cache(async () => {
  if (!readSupabasePublicConfig()) return null;
  const client = await createSupabaseAuthClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user || !data.user.email_confirmed_at) return null;
  return data.user;
});
