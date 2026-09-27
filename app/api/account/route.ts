import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth/authorization";
import { deleteClerkUser } from "@/lib/auth/clerk-server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const supportedCurrencies = new Set(["TRY", "EUR", "USD", "GBP"]);
const supportedLanguages = new Set(["en", "tr"]);

export async function GET() {
  try {
    const user = await requireAppUser();
    const { data, error } = await getSupabaseServerClient()
      .from("users")
      .select("currency, language")
      .eq("id", user.id)
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("[account] preferences could not be loaded", error);
    return NextResponse.json({ error: "Unable to load account preferences." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAppUser();
    const body = await request.json() as { currency?: unknown; language?: unknown };
    const updates: { currency?: string; language?: string } = {};
    if (typeof body.currency === "string" && supportedCurrencies.has(body.currency)) updates.currency = body.currency;
    if (typeof body.language === "string" && supportedLanguages.has(body.language)) updates.language = body.language;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Choose a supported currency or language." }, { status: 400 });
    }
    const { data, error } = await getSupabaseServerClient()
      .from("users")
      .update(updates)
      .eq("id", user.id)
      .select("currency, language")
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("[account] preferences could not be updated", error);
    return NextResponse.json({ error: "Unable to update account preferences." }, { status: 500 });
  }
}

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
