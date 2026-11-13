import { NextResponse } from "next/server";
import { AccessError, getAcceptedFamilyRole, requireAppUser } from "@/lib/auth/authorization";
import { occasions, visibleWishlistItem } from "@/lib/finance/wishlist";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function fail(error: unknown) {
  if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("[wishlists] request failed", error);
  return NextResponse.json({ error: "Wishlists unavailable." }, { status: 500 });
}

export async function GET() {
  try {
    const user = await requireAppUser();
    const supabase = getSupabaseServerClient();
    const members = await supabase.from("family_members").select("family_group_id").eq("user_id", user.id).eq("invitation_status", "accepted");
    if (members.error) throw members.error;
    const groupIds = (members.data ?? []).map((member) => member.family_group_id);
    const columns = "id, family_group_id, owner_user_id, title, occasion, event_date, surprise, created_at";
    const [accepted, familyLists, personalLists] = await Promise.all([
      groupIds.length ? supabase.from("family_members").select("family_group_id, user_id").in("family_group_id", groupIds).eq("invitation_status", "accepted") : Promise.resolve({ data: [], error: null }),
      groupIds.length ? supabase.from("wishlists").select(columns).in("family_group_id", groupIds) : Promise.resolve({ data: [], error: null }),
      supabase.from("wishlists").select(columns).is("family_group_id", null).eq("owner_user_id", user.id),
    ]);
    for (const result of [accepted, familyLists, personalLists]) if (result.error) throw result.error;
    const acceptedPairs = new Set((accepted.data ?? []).map((member) => `${member.family_group_id}:${member.user_id}`));
    const visibleLists = [
      ...(personalLists.data ?? []),
      ...(familyLists.data ?? []).filter((list) => acceptedPairs.has(`${list.family_group_id}:${list.owner_user_id}`)),
    ].sort((left, right) => right.created_at.localeCompare(left.created_at));
    const ids = visibleLists.map((list) => list.id);
    const items = ids.length ? await supabase.from("wishlist_items").select("id, wishlist_id, name, note, product_url, reserved_by_user_id").in("wishlist_id", ids).order("created_at") : { data: [], error: null };
    if (items.error) throw items.error;
    return NextResponse.json({ lists: visibleLists.map((list) => ({
      id: list.id, familyGroupId: list.family_group_id, mine: list.owner_user_id === user.id,
      title: list.title, occasion: list.occasion, eventDate: list.event_date, surprise: list.surprise,
      items: (items.data ?? []).filter((item) => item.wishlist_id === list.id).map((item) => visibleWishlistItem(item, list.owner_user_id, user.id, list.surprise)),
    })) });
  } catch (error) { return fail(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = await request.json() as { familyGroupId?: unknown; title?: unknown; occasion?: unknown; eventDate?: unknown; surprise?: unknown };
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const familyGroupId = body.familyGroupId === "" || body.familyGroupId === null || body.familyGroupId === undefined ? null : body.familyGroupId;
    if ((familyGroupId !== null && typeof familyGroupId !== "string") || title.length < 2 || title.length > 100 || !occasions.includes(body.occasion as typeof occasions[number]) || typeof body.surprise !== "boolean") return NextResponse.json({ error: "Check the wishlist fields." }, { status: 400 });
    const eventDate = body.eventDate === "" || body.eventDate === null || body.eventDate === undefined ? null : body.eventDate;
    if (eventDate !== null && (typeof eventDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate))) return NextResponse.json({ error: "Invalid occasion date." }, { status: 400 });
    if (familyGroupId !== null && !await getAcceptedFamilyRole(user.id, familyGroupId)) throw new AccessError("Family group not found.", 404);
    const { data, error } = await getSupabaseServerClient().from("wishlists").insert({ family_group_id: familyGroupId, owner_user_id: user.id, title, occasion: body.occasion, event_date: eventDate, surprise: body.surprise }).select("id").single();
    if (error) throw error;
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) { return fail(error); }
}
