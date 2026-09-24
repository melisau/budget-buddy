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
    if (!groupIds.length) return NextResponse.json({ lists: [] });
    const accepted = await supabase.from("family_members").select("family_group_id, user_id").in("family_group_id", groupIds).eq("invitation_status", "accepted");
    if (accepted.error) throw accepted.error;
    const acceptedPairs = new Set((accepted.data ?? []).map((member) => `${member.family_group_id}:${member.user_id}`));
    const lists = await supabase.from("wishlists").select("id, family_group_id, owner_user_id, title, occasion, event_date, surprise, created_at")
      .in("family_group_id", groupIds).order("created_at", { ascending: false });
    if (lists.error) throw lists.error;
    const visibleLists = (lists.data ?? []).filter((list) => acceptedPairs.has(`${list.family_group_id}:${list.owner_user_id}`));
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
    if (typeof body.familyGroupId !== "string" || title.length < 2 || title.length > 100 || !occasions.includes(body.occasion as typeof occasions[number]) || typeof body.surprise !== "boolean") return NextResponse.json({ error: "Check the wishlist fields." }, { status: 400 });
    const eventDate = body.eventDate === "" || body.eventDate === null || body.eventDate === undefined ? null : body.eventDate;
    if (eventDate !== null && (typeof eventDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate))) return NextResponse.json({ error: "Invalid occasion date." }, { status: 400 });
    if (!await getAcceptedFamilyRole(user.id, body.familyGroupId)) throw new AccessError("Family group not found.", 404);
    const { data, error } = await getSupabaseServerClient().from("wishlists").insert({ family_group_id: body.familyGroupId, owner_user_id: user.id, title, occasion: body.occasion, event_date: eventDate, surprise: body.surprise }).select("id").single();
    if (error) throw error;
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) { return fail(error); }
}
