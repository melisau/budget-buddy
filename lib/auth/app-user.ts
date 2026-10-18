import "server-only";
import { createSupabaseAuthClient } from "@/lib/supabase/auth-server";

export async function syncAppUser(): Promise<void> {
  const supabase = await createSupabaseAuthClient();
  // Identity comes from auth.uid(), never from client-provided parameters.
  const { error } = await supabase.rpc("sync_authenticated_user");
  if (error) throw new Error(`Unable to sync the signed-in user: ${error.message}`);
}
