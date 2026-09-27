import { getCurrentUser } from "@/lib/auth/supabase-server";
import { syncAppUser } from "@/lib/auth/app-user";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export class AccessError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 | 404 = 403,
  ) {
    super(message);
  }
}

export type AppUser = {
  id: string;
  authUserId: string;
  email: string | null;
  name: string | null;
};

export type FamilyRole = "owner" | "member" | "viewer";

export async function requireAppUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AccessError("Sign in is required.", 401);
  }

  const supabase = getSupabaseServerClient();
  const lookup = await supabase
    .from("users")
    .select("id, auth_user_id, email, name")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (lookup.error) throw new Error(`Unable to look up the signed-in user: ${lookup.error.message}`);

  let appUser = lookup.data;

  if (!appUser) {
    await syncAppUser();
    const retry = await supabase
      .from("users")
      .select("id, auth_user_id, email, name")
      .eq("auth_user_id", user.id)
      .single();

    if (retry.error) throw new Error(`Unable to create the signed-in user: ${retry.error.message}`);
    appUser = retry.data;
  }

  return { id: appUser.id, authUserId: appUser.auth_user_id, email: appUser.email, name: appUser.name };
}

export async function getAcceptedFamilyRole(userId: string, familyGroupId: string): Promise<FamilyRole | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("family_members")
    .select("role")
    .eq("family_group_id", familyGroupId)
    .eq("user_id", userId)
    .eq("invitation_status", "accepted")
    .maybeSingle();

  if (error) throw new Error(`Unable to check family membership: ${error.message}`);
  return data?.role as FamilyRole | undefined ?? null;
}

export async function requireFamilyWriteAccess(userId: string, familyGroupId: string): Promise<FamilyRole> {
  const role = await getAcceptedFamilyRole(userId, familyGroupId);
  if (!role || role === "viewer") {
    throw new AccessError("You do not have permission to change this family data.");
  }
  return role;
}

export async function requireTransactionWriteAccess(userId: string, transactionId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { data: transaction, error } = await supabase
    .from("transactions")
    .select("user_id, owner_user_id, family_group_id")
    .eq("id", transactionId)
    .maybeSingle();

  if (error) throw new Error(`Unable to look up the transaction: ${error.message}`);
  if (!transaction) throw new AccessError("Transaction not found.", 404);
  if (transaction.user_id === userId && !transaction.family_group_id) return;
  if (transaction.family_group_id) {
    await requireFamilyWriteAccess(userId, transaction.family_group_id);
    if (transaction.owner_user_id !== userId) {
      throw new AccessError("You can only change family transactions created in your own name.");
    }
    return;
  }
  throw new AccessError("You do not have permission to change this transaction.");
}

export async function requireTransactionReadAccess(userId: string, transactionId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { data: transaction, error } = await supabase
    .from("transactions")
    .select("user_id, family_group_id")
    .eq("id", transactionId)
    .maybeSingle();
  if (error) throw new Error(`Unable to look up the transaction: ${error.message}`);
  if (!transaction) throw new AccessError("Transaction not found.", 404);
  if (transaction.user_id === userId && !transaction.family_group_id) return;
  if (transaction.family_group_id && await getAcceptedFamilyRole(userId, transaction.family_group_id)) return;
  throw new AccessError("You do not have permission to view this transaction.");
}
