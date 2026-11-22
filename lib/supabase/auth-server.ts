import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { parseBearerCredential, type BearerCredential } from "@/lib/auth/bearer";
import { getSupabasePublicConfig } from "./config";

export async function readBearerCredential(): Promise<BearerCredential> {
  return parseBearerCredential((await headers()).get("authorization"));
}

// Per-request unprivileged client; never share session state across requests.
export async function createSupabaseAuthClient() {
  const { url, key } = getSupabasePublicConfig();
  const bearer = await readBearerCredential();
  if (bearer.kind === "invalid") throw new Error("Invalid bearer credential.");
  if (bearer.kind === "token") {
    return createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${bearer.token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Components are read-only; proxy refreshes their cookies.
        }
      },
    },
  });
}
