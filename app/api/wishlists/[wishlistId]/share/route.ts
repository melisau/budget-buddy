import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ wishlistId: string }> };

function fail(error: unknown) {
  if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("[wishlist-share] request failed", error);
  return NextResponse.json({ error: "Unable to update the share link." }, { status: 500 });
}

// Only the list owner may create, rotate or revoke its read-only link.
async function ownedList(context: Context) {
  const user = await requireAppUser();
  const { wishlistId } = await context.params;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("wishlists").select("id").eq("id", wishlistId).eq("owner_user_id", user.id).maybeSingle();
  if (error) throw error;
  if (!data) throw new AccessError("Wishlist not found.", 404);
  return { user, supabase, id: data.id as string };
}

// Creates a new link, replacing (and so revoking) any earlier one.
export async function POST(_request: Request, context: Context) {
  try {
    const { user, supabase, id } = await ownedList(context);
    const shareToken = randomBytes(24).toString("base64url");
    const { error } = await supabase.from("wishlists").update({ share_token: shareToken, shared_at: new Date().toISOString() }).eq("id", id).eq("owner_user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ shareToken });
  } catch (error) { return fail(error); }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { user, supabase, id } = await ownedList(context);
    const { error } = await supabase.from("wishlists").update({ share_token: null, shared_at: null }).eq("id", id).eq("owner_user_id", user.id);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (error) { return fail(error); }
}
