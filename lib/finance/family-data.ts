import { AccessError, type AppUser, type FamilyRole } from "@/lib/auth/authorization";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const roles = ["owner", "member", "viewer"] as const;
export type ManageableFamilyRole = Exclude<FamilyRole, "owner">;

export type FamilyMemberData = {
  id: string;
  userId: string | null;
  name: string;
  email: string | null;
  role: FamilyRole;
  invitationStatus: "pending" | "accepted" | "declined";
};

export type FamilyGroupData = {
  id: string;
  name: string;
  currency: string;
  ownerUserId: string;
  role: FamilyRole;
  members: FamilyMemberData[];
};

function normalizedEmail(email: string) {
  return email.trim().toLowerCase();
}

function assertRole(role: string): asserts role is FamilyRole {
  if (!roles.includes(role as FamilyRole)) throw new AccessError("The requested family role is invalid.", 404);
}

async function getMembership(userId: string, familyGroupId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("family_members")
    .select("id, role, invitation_status")
    .eq("family_group_id", familyGroupId)
    .eq("user_id", userId)
    .eq("invitation_status", "accepted")
    .maybeSingle();
  if (error) throw new Error(`Unable to check family membership: ${error.message}`);
  return data;
}

async function requireOwner(user: AppUser, familyGroupId: string) {
  const membership = await getMembership(user.id, familyGroupId);
  if (!membership || membership.role !== "owner") {
    throw new AccessError("Only the family owner can manage members.");
  }
  return membership;
}

async function loadMembers(familyGroupId: string): Promise<FamilyMemberData[]> {
  const supabase = getSupabaseServerClient();
  const { data: memberRows, error: membersError } = await supabase
    .from("family_members")
    .select("id, user_id, invited_email, role, invitation_status")
    .eq("family_group_id", familyGroupId)
    .order("created_at");
  if (membersError) throw new Error(`Unable to load family members: ${membersError.message}`);

  const ids = (memberRows ?? []).flatMap((member) => member.user_id ? [member.user_id] : []);
  const { data: users, error: usersError } = ids.length
    ? await supabase.from("users").select("id, name, email").in("id", ids)
    : { data: [], error: null };
  if (usersError) throw new Error(`Unable to load family member profiles: ${usersError.message}`);
  const profiles = new Map((users ?? []).map((profile) => [profile.id, profile]));

  return (memberRows ?? []).map((member) => {
    const profile = member.user_id ? profiles.get(member.user_id) : undefined;
    return {
      id: member.id,
      userId: member.user_id,
      name: profile?.name || member.invited_email || "Pending member",
      email: profile?.email || member.invited_email,
      role: member.role as FamilyRole,
      invitationStatus: member.invitation_status as FamilyMemberData["invitationStatus"],
    };
  });
}

export async function listFamilyGroups(user: AppUser): Promise<FamilyGroupData[]> {
  const supabase = getSupabaseServerClient();
  const { data: memberships, error } = await supabase
    .from("family_members")
    .select("family_group_id, role")
    .eq("user_id", user.id)
    .eq("invitation_status", "accepted");
  if (error) throw new Error(`Unable to load family memberships: ${error.message}`);
  if (!memberships?.length) return [];

  const ids = memberships.map((membership) => membership.family_group_id);
  const { data: groups, error: groupsError } = await supabase
    .from("family_groups")
    .select("id, name, currency, owner_user_id")
    .in("id", ids)
    .order("created_at");
  if (groupsError) throw new Error(`Unable to load family groups: ${groupsError.message}`);
  const rolesByGroup = new Map(memberships.map((membership) => [membership.family_group_id, membership.role as FamilyRole]));

  return Promise.all((groups ?? []).map(async (group) => ({
    id: group.id,
    name: group.name,
    currency: group.currency,
    ownerUserId: group.owner_user_id,
    role: rolesByGroup.get(group.id) ?? "viewer",
    members: await loadMembers(group.id),
  })));
}

export async function createFamilyGroup(user: AppUser, name: string, currency = "TRY") {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 80) throw new AccessError("Family name must contain 2 to 80 characters.", 404);
  const supabase = getSupabaseServerClient();
  const { data: group, error: groupError } = await supabase
    .from("family_groups")
    .insert({ owner_user_id: user.id, name: trimmed, currency })
    .select("id")
    .single();
  if (groupError) throw new Error(`Unable to create family group: ${groupError.message}`);

  const { error: memberError } = await supabase.from("family_members").insert({
    family_group_id: group.id,
    user_id: user.id,
    role: "owner",
    invitation_status: "accepted",
  });
  if (memberError) {
    await supabase.from("family_groups").delete().eq("id", group.id);
    throw new Error(`Unable to add the family owner: ${memberError.message}`);
  }
  return group.id;
}

export async function createFamilyInvite(user: AppUser, familyGroupId: string, email: string, role: ManageableFamilyRole) {
  await requireOwner(user, familyGroupId);
  if (role !== "member" && role !== "viewer") throw new AccessError("Only member or viewer can be invited.", 404);
  const invitationEmail = normalizedEmail(email);
  if (!/^\S+@\S+\.\S+$/.test(invitationEmail)) throw new AccessError("Enter a valid email address.", 404);
  if (user.email && invitationEmail === normalizedEmail(user.email)) throw new AccessError("You are already a member of this family group.");

  const supabase = getSupabaseServerClient();
  const { data: existing, error: existingError } = await supabase
    .from("family_members")
    .select("id")
    .eq("family_group_id", familyGroupId)
    .ilike("invited_email", invitationEmail)
    .in("invitation_status", ["pending", "accepted"])
    .maybeSingle();
  if (existingError) throw new Error(`Unable to check the invitation: ${existingError.message}`);
  if (existing) throw new AccessError("This email already has an active family invitation.");

  const { data, error } = await supabase.from("family_members").insert({
    family_group_id: familyGroupId,
    invited_email: invitationEmail,
    role,
    invitation_status: "pending",
  }).select("id").single();
  if (error) throw new Error(`Unable to create the invitation: ${error.message}`);
  return data.id;
}

export async function respondToFamilyInvite(user: AppUser, invitationId: string, accept: boolean) {
  if (!user.email) throw new AccessError("A verified account email is required to respond to a family invitation.");
  const supabase = getSupabaseServerClient();
  const { data: invitation, error } = await supabase
    .from("family_members")
    .select("id, invited_email")
    .eq("id", invitationId)
    .eq("invitation_status", "pending")
    .maybeSingle();
  if (error) throw new Error(`Unable to load the invitation: ${error.message}`);
  if (!invitation || !invitation.invited_email || normalizedEmail(invitation.invited_email) !== normalizedEmail(user.email)) {
    throw new AccessError("This family invitation is unavailable.", 404);
  }
  const update = accept
    ? { invitation_status: "accepted", user_id: user.id }
    : { invitation_status: "declined" };
  const { error: updateError } = await supabase.from("family_members").update(update).eq("id", invitationId);
  if (updateError) throw new Error(`Unable to update the invitation: ${updateError.message}`);
}

export async function listPendingFamilyInvites(user: AppUser) {
  if (!user.email) return [];
  const supabase = getSupabaseServerClient();
  const { data: invitations, error } = await supabase
    .from("family_members")
    .select("id, family_group_id, role, invited_email")
    .eq("invitation_status", "pending")
    .ilike("invited_email", normalizedEmail(user.email));
  if (error) throw new Error(`Unable to load family invitations: ${error.message}`);
  const groupIds = (invitations ?? []).map((invite) => invite.family_group_id);
  const { data: groups, error: groupsError } = groupIds.length
    ? await supabase.from("family_groups").select("id, name").in("id", groupIds)
    : { data: [], error: null };
  if (groupsError) throw new Error(`Unable to load invited family groups: ${groupsError.message}`);
  const names = new Map((groups ?? []).map((group) => [group.id, group.name]));
  return (invitations ?? []).map((invite) => ({
    id: invite.id,
    familyGroupId: invite.family_group_id,
    groupName: names.get(invite.family_group_id) ?? "Family group",
    role: invite.role as ManageableFamilyRole,
  }));
}

export async function updateFamilyMemberRole(user: AppUser, familyGroupId: string, memberId: string, role: ManageableFamilyRole) {
  await requireOwner(user, familyGroupId);
  if (role !== "member" && role !== "viewer") throw new AccessError("The owner role cannot be assigned here.", 404);
  const supabase = getSupabaseServerClient();
  const { data: member, error } = await supabase.from("family_members").select("role").eq("id", memberId).eq("family_group_id", familyGroupId).maybeSingle();
  if (error) throw new Error(`Unable to load the family member: ${error.message}`);
  if (!member) throw new AccessError("Family member not found.", 404);
  assertRole(member.role);
  if (member.role === "owner") throw new AccessError("Transfer ownership before changing the owner role.");
  const { error: updateError } = await supabase.from("family_members").update({ role }).eq("id", memberId);
  if (updateError) throw new Error(`Unable to update the family member role: ${updateError.message}`);
}

export async function removeFamilyMember(user: AppUser, familyGroupId: string, memberId: string) {
  await requireOwner(user, familyGroupId);
  const supabase = getSupabaseServerClient();
  const { data: member, error } = await supabase.from("family_members").select("role").eq("id", memberId).eq("family_group_id", familyGroupId).maybeSingle();
  if (error) throw new Error(`Unable to load the family member: ${error.message}`);
  if (!member) throw new AccessError("Family member not found.", 404);
  if (member.role === "owner") throw new AccessError("Transfer ownership before removing the owner.");
  const { error: deleteError } = await supabase.from("family_members").delete().eq("id", memberId);
  if (deleteError) throw new Error(`Unable to remove the family member: ${deleteError.message}`);
}

export async function transferFamilyOwnership(user: AppUser, familyGroupId: string, nextOwnerUserId: string) {
  await requireOwner(user, familyGroupId);
  if (nextOwnerUserId === user.id) throw new AccessError("Choose another accepted family member.");
  const nextOwner = await getMembership(nextOwnerUserId, familyGroupId);
  if (!nextOwner) throw new AccessError("The new owner must be an accepted family member.", 404);
  const supabase = getSupabaseServerClient();
  const { error: groupError } = await supabase.from("family_groups").update({ owner_user_id: nextOwnerUserId }).eq("id", familyGroupId);
  if (groupError) throw new Error(`Unable to transfer ownership: ${groupError.message}`);
  const { error: newOwnerError } = await supabase.from("family_members").update({ role: "owner" }).eq("family_group_id", familyGroupId).eq("user_id", nextOwnerUserId);
  if (newOwnerError) throw new Error(`Unable to assign the new owner: ${newOwnerError.message}`);
  const { error: formerOwnerError } = await supabase.from("family_members").update({ role: "member" }).eq("family_group_id", familyGroupId).eq("user_id", user.id);
  if (formerOwnerError) throw new Error(`Unable to update the former owner role: ${formerOwnerError.message}`);
}

export async function leaveFamilyGroup(user: AppUser, familyGroupId: string) {
  const membership = await getMembership(user.id, familyGroupId);
  if (!membership) throw new AccessError("You are not an active member of this family group.", 404);
  if (membership.role === "owner") throw new AccessError("Transfer ownership or delete the group before leaving.");
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("family_members").delete().eq("family_group_id", familyGroupId).eq("user_id", user.id);
  if (error) throw new Error(`Unable to leave the family group: ${error.message}`);
}

export async function deleteFamilyGroup(user: AppUser, familyGroupId: string) {
  await requireOwner(user, familyGroupId);
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("family_groups").delete().eq("id", familyGroupId);
  if (error) throw new Error(`Unable to delete the family group: ${error.message}`);
}
