import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl() && supabaseSecretKey(),
  );
}

function supabaseUrl(): string | undefined {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function supabaseSecretKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
}

/**
 * Returns the server-only Supabase client. This intentionally uses the service
 * role key only on trusted route handlers/server actions, never in a browser
 * component. User ownership must be checked before every query.
 */
export function getSupabaseServerClient() {
  if (client) return client;

  const url = supabaseUrl();
  const serviceRoleKey = supabaseSecretKey();

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server configuration is unavailable.");
  }

  client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return client;
}
