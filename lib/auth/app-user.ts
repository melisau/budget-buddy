import "server-only";
import { getAuthState } from "@/lib/auth/supabase-server";
import { createSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { getSupabaseServerClient, isSelfHostedData } from "@/lib/supabase/server";

export async function syncAppUser(): Promise<void> {
  if (isSelfHostedData()) {
    // getAuthState verified this identity with Supabase Auth on this request.
    const { user } = await getAuthState();
    if (!user?.email) throw new Error("Unable to sync the signed-in user: no verified identity.");
    const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
    const { error } = await getSupabaseServerClient().rpc("sync_verified_user", { p_auth_user_id: user.id, p_email: user.email, p_full_name: fullName });
    if (error) throw new Error(`Unable to sync the signed-in user: ${error.message}`);
    return;
  }

  const supabase = await createSupabaseAuthClient();
  // Identity comes from auth.uid(), never from client-provided parameters.
  const { error } = await supabase.rpc("sync_authenticated_user");
  if (error) throw new Error(`Unable to sync the signed-in user: ${error.message}`);
}
