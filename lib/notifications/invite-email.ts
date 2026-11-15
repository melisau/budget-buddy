import "server-only";
import { inviteEmail } from "@/lib/notifications/email-templates";
import { isEmailConfigured, sendEmail } from "@/lib/notifications/email";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { SITE_URL } from "@/lib/site";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Tells the invited address about a family invitation. Best effort: the
 * invitation already exists, so a failure here is logged and never reported
 * as a failed invitation. Limited per owner so the form cannot be used to
 * send mail to strangers in bulk.
 */
export async function sendFamilyInviteEmail(owner: { id: string; name: string | null; email: string | null }, familyGroupId: string, toEmail: string): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  try {
    const limit = await checkRateLimit(`family-invite-email:${owner.id}`, 10, 60 * 60_000);
    if (!limit.allowed) return false;
    const { data: group, error } = await getSupabaseServerClient().from("family_groups").select("name").eq("id", familyGroupId).single();
    if (error) throw error;
    const inviterName = owner.name?.trim() || owner.email || "BudgetBuddy";
    await sendEmail(toEmail.trim().toLowerCase(), inviteEmail(group.name as string, inviterName, SITE_URL));
    return true;
  } catch (error) {
    console.error("[family invitation] e-mail could not be sent", error instanceof Error ? error.message : error);
    return false;
  }
}
