import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;
let adminClient: SupabaseClient | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    (dataApiUrl() && process.env.DATA_API_KEY) || (supabaseUrl() && supabaseSecretKey()),
  );
}

function supabaseUrl(): string | undefined {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function supabaseSecretKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function dataApiUrl(): string | undefined {
  return process.env.DATA_API_URL?.trim().replace(/\/+$/, "") || undefined;
}

/** True when application data lives in the self-hosted PostgreSQL. */
export function isSelfHostedData(): boolean {
  return Boolean(dataApiUrl());
}

// supabase-js calls `<url>/rest/v1`; a standalone PostgREST serves at its root.
export function postgrestFetch(baseUrl: string, send: typeof fetch = fetch): typeof fetch {
  const prefix = `${baseUrl}/rest/v1`;
  return (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (!url.startsWith(prefix)) throw new Error("Data API request has an unexpected URL.");
    const target = `${baseUrl}${url.slice(prefix.length)}`;
    return input instanceof Request ? send(new Request(target, input), init) : send(target, init);
  };
}

/**
 * Returns the server-only Supabase client. This intentionally uses the service
 * role key only on trusted route handlers/server actions, never in a browser
 * component. User ownership must be checked before every query.
 */
export function getSupabaseServerClient() {
  if (client) return client;

  const dataUrl = dataApiUrl();
  if (dataUrl) {
    const dataKey = process.env.DATA_API_KEY?.trim();
    if (!dataKey) throw new Error("Data API configuration is unavailable.");
    client = createClient(dataUrl, dataKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: postgrestFetch(dataUrl) },
    });
    return client;
  }

  return (client = getSupabaseAdminClient());
}

/** Hosted Supabase services that stay outside the data API: Auth admin and Storage. */
export function getSupabaseAdminClient() {
  if (adminClient) return adminClient;

  const url = supabaseUrl();
  const serviceRoleKey = supabaseSecretKey();

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server configuration is unavailable.");
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return adminClient;
}
