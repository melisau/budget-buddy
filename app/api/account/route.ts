import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth/authorization";
import { deleteClerkUser } from "@/lib/auth/clerk-server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE() {
  try {
    const user = await requireAppUser();
    const { error } = await getSupabaseServerClient().from("users").delete().eq("id", user.id);
    if (error) throw error;
    await deleteClerkUser(user.clerkUserId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[account] deletion failed", error);
    return NextResponse.json({ error: "Unable to delete the account." }, { status: 500 });
  }
}
