import { NextResponse } from "next/server";
import { AccessError, getAcceptedFamilyRole, requireAppUser } from "@/lib/auth/authorization";
import { safeProductUrl } from "@/lib/finance/wishlist";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ wishlistId: string }> };
function fail(error: unknown) {
  if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("[wishlist] request failed", error);
  return NextResponse.json({ error: "Unable to update wishlist." }, { status: 500 });
}
async function contextFor(context: Context) {
  const user = await requireAppUser();
  const { wishlistId } = await context.params;
  const supabase = getSupabaseServerClient();
  const { data: list, error } = await supabase.from("wishlists").select("id, family_group_id, owner_user_id").eq("id", wishlistId).maybeSingle();
  if (error) throw error;
  if (!list || !await getAcceptedFamilyRole(user.id, list.family_group_id) || !await getAcceptedFamilyRole(list.owner_user_id, list.family_group_id)) throw new AccessError("Wishlist not found.", 404);
  return { user, list, supabase };
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { user, list, supabase } = await contextFor(context);
    const body = await request.json() as { action?: unknown; itemId?: unknown; name?: unknown; note?: unknown; productUrl?: unknown; surprise?: unknown };
    if (body.action === "add") {
      if (list.owner_user_id !== user.id) throw new AccessError("Only the list owner can add wishes.");
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const note = typeof body.note === "string" ? body.note.trim() : "";
      const productUrl = safeProductUrl(body.productUrl);
      if (!name || name.length > 120 || note.length > 300 || productUrl === undefined) return NextResponse.json({ error: "Check the wish details and URL." }, { status: 400 });
      const { error } = await supabase.from("wishlist_items").insert({ wishlist_id: list.id, name, note, product_url: productUrl });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }
    if (body.action === "settings") {
      if (list.owner_user_id !== user.id) throw new AccessError("Only the list owner can change surprise mode.");
      if (typeof body.surprise !== "boolean") return NextResponse.json({ error: "Invalid surprise setting." }, { status: 400 });
      const { error } = await supabase.from("wishlists").update({ surprise: body.surprise }).eq("id", list.id).eq("owner_user_id", user.id);
      if (error) throw error;
      return NextResponse.json({ surprise: body.surprise });
    }
    if (list.owner_user_id === user.id) throw new AccessError("The list owner cannot reserve their own gifts.");
    if (typeof body.itemId !== "string") return NextResponse.json({ error: "Invalid wish." }, { status: 400 });
    if (body.action === "reserve") {
      // Conditional update is atomic: only one member can reserve a gift.
      const { data, error } = await supabase.from("wishlist_items").update({ reserved_by_user_id: user.id, reserved_at: new Date().toISOString() })
        .eq("id", body.itemId).eq("wishlist_id", list.id).is("reserved_by_user_id", null).select("id").maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ error: "This gift has already been chosen." }, { status: 409 });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "release") {
      const { data, error } = await supabase.from("wishlist_items").update({ reserved_by_user_id: null, reserved_at: null })
        .eq("id", body.itemId).eq("wishlist_id", list.id).eq("reserved_by_user_id", user.id).select("id").maybeSingle();
      if (error) throw error;
      if (!data) throw new AccessError("Only the person who chose this gift can release it.");
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) { return fail(error); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const { user, list, supabase } = await contextFor(context);
    if (list.owner_user_id !== user.id) throw new AccessError("Only the list owner can remove wishes.");
    const body = await request.json() as { itemId?: unknown };
    if (typeof body.itemId === "string") {
      const { error } = await supabase.from("wishlist_items").delete().eq("id", body.itemId).eq("wishlist_id", list.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("wishlists").delete().eq("id", list.id).eq("owner_user_id", user.id);
      if (error) throw error;
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) { return fail(error); }
}
