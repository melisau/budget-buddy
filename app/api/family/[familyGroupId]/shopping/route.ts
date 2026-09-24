import { NextResponse } from "next/server";
import { AccessError, getAcceptedFamilyRole, requireAppUser } from "@/lib/auth/authorization";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ familyGroupId: string }> };
const itemFields = "id, name, quantity, requested_by_user_id, checked_by_user_id, checked_at, created_at";
function fail(error: unknown) {
  if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("[shopping] request failed", error);
  return NextResponse.json({ error: "Shopping list unavailable." }, { status: 500 });
}

async function contextFor(context: Context, write = false) {
  const user = await requireAppUser();
  const { familyGroupId } = await context.params;
  const role = await getAcceptedFamilyRole(user.id, familyGroupId);
  if (!role) throw new AccessError("Family group not found.", 404);
  if (write && role === "viewer") throw new AccessError("You cannot change this family's shopping list.");
  return { user, familyGroupId, role, supabase: getSupabaseServerClient() };
}

export async function GET(_: Request, context: Context) {
  try {
    const { user, familyGroupId, supabase } = await contextFor(context);
    const [items, note, shares] = await Promise.all([
      supabase.from("family_shopping_items").select(itemFields).eq("family_group_id", familyGroupId).order("created_at", { ascending: false }),
      supabase.from("family_shopping_notes").select("content, updated_at").eq("family_group_id", familyGroupId).maybeSingle(),
      supabase.from("goal_shares").select("goal_id, shared_by_user_id").eq("family_group_id", familyGroupId),
    ]);
    if (items.error || note.error || shares.error) throw items.error ?? note.error ?? shares.error;
    const members = await supabase.from("family_members").select("user_id").eq("family_group_id", familyGroupId).eq("invitation_status", "accepted");
    if (members.error) throw members.error;
    const acceptedIds = new Set((members.data ?? []).map((member) => member.user_id));
    const visibleShares = (shares.data ?? []).filter((share) => acceptedIds.has(share.shared_by_user_id));
    const goalIds = visibleShares.map((share) => share.goal_id);
    const goals = goalIds.length ? await supabase.from("goals").select("id, name, target_amount, current_amount").in("id", goalIds) : { data: [], error: null };
    if (goals.error) throw goals.error;
    const sharedGoals = (goals.data ?? []).map((goal) => ({
      id: goal.id, name: goal.name,
      progress: Math.min(100, Math.round(Number(goal.current_amount) / Number(goal.target_amount) * 100)),
      sharedByUserId: visibleShares.find((share) => share.goal_id === goal.id)?.shared_by_user_id,
    }));
    return NextResponse.json({ items: items.data ?? [], note: note.data?.content ?? "", sharedGoals, viewerUserId: user.id });
  } catch (error) { return fail(error); }
}

export async function POST(request: Request, context: Context) {
  try {
    const { user, familyGroupId, supabase } = await contextFor(context, true);
    const body = await request.json() as { name?: unknown; quantity?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const quantity = typeof body.quantity === "string" ? body.quantity.trim() : "";
    if (!name || name.length > 120 || quantity.length > 40) return NextResponse.json({ error: "Enter a valid item and quantity." }, { status: 400 });
    const { data, error } = await supabase.from("family_shopping_items").insert({ family_group_id: familyGroupId, name, quantity, requested_by_user_id: user.id }).select(itemFields).single();
    if (error) throw error;
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) { return fail(error); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { user, familyGroupId, supabase } = await contextFor(context, true);
    const body = await request.json() as { note?: unknown; itemId?: unknown; checked?: unknown };
    if (body.note !== undefined) {
      if (typeof body.note !== "string" || body.note.length > 2000) return NextResponse.json({ error: "Note is too long." }, { status: 400 });
      const { error } = await supabase.from("family_shopping_notes").upsert({ family_group_id: familyGroupId, content: body.note, updated_by_user_id: user.id });
      if (error) throw error;
      return NextResponse.json({ note: body.note });
    }
    if (typeof body.itemId !== "string" || typeof body.checked !== "boolean") return NextResponse.json({ error: "Invalid item update." }, { status: 400 });
    const { data, error } = await supabase.from("family_shopping_items")
      .update({ checked_at: body.checked ? new Date().toISOString() : null, checked_by_user_id: body.checked ? user.id : null })
      .eq("id", body.itemId).eq("family_group_id", familyGroupId).select(itemFields).maybeSingle();
    if (error) throw error;
    if (!data) throw new AccessError("Item not found.", 404);
    return NextResponse.json({ item: data });
  } catch (error) { return fail(error); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const { user, role, familyGroupId, supabase } = await contextFor(context, true);
    const body = await request.json() as { itemId?: unknown };
    if (typeof body.itemId !== "string") return NextResponse.json({ error: "Invalid item." }, { status: 400 });
    let query = supabase.from("family_shopping_items").delete({ count: "exact" }).eq("id", body.itemId).eq("family_group_id", familyGroupId);
    if (role !== "owner") query = query.eq("requested_by_user_id", user.id);
    const { error, count } = await query;
    if (error) throw error;
    if (!count) throw new AccessError("Item not found or not yours.", 404);
    return new NextResponse(null, { status: 204 });
  } catch (error) { return fail(error); }
}
