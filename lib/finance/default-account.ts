import { defaultAccountFromRpc } from "@/lib/finance/default-account-result";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Call only with the ID of a verified user. */
export async function ensureDefaultAccount(userId: string) {
  return defaultAccountFromRpc(await getSupabaseServerClient().rpc("ensure_default_account", { p_user_id: userId }));
}
