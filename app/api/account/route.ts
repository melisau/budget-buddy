import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { createSupabaseAuthClient } from "@/lib/supabase/auth-server";
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
    return NextResponse.json({ error: "Unable to load account preferences." }, { status: error instanceof AccessError ? error.status : 500 });
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
    return NextResponse.json({ error: "Unable to update account preferences." }, { status: error instanceof AccessError ? error.status : 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin) {
      return NextResponse.json({ error: "Same-origin request required." }, { status: 403 });
    }
    const user = await requireAppUser();
    // Auth deletion and app-row cascades commit atomically in PostgreSQL.
    // If Auth deletion fails, financial records remain intact.
    const { error } = await getSupabaseServerClient().auth.admin.deleteUser(user.authUserId);
    if (error) throw error;
    const client = await createSupabaseAuthClient();
    await client.auth.signOut({ scope: "local" });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[account] deletion failed", error);
    return NextResponse.json({ error: "Unable to delete the account." }, { status: error instanceof AccessError ? error.status : 500 });
  }
}
