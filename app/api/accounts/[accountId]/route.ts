import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ accountId: string }> };
const accountTypes = ["cash", "checking", "savings", "credit_card", "digital_wallet"];
const currencies = ["TRY", "EUR", "USD", "GBP"];
function response(error: unknown) { if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status }); console.error("[accounts] update failed", error); return NextResponse.json({ error: "Unable to update the account." }, { status: 500 }); }

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireAppUser(); const { accountId } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if (typeof body.name === "string") { const name = body.name.trim(); if (name.length < 2 || name.length > 80) return NextResponse.json({ error: "Check the account name." }, { status: 400 }); update.name = name; }
    if (typeof body.type === "string") { if (!accountTypes.includes(body.type)) return NextResponse.json({ error: "Check the account type." }, { status: 400 }); update.type = body.type; }
    if (typeof body.currency === "string") { if (!currencies.includes(body.currency)) return NextResponse.json({ error: "Check the currency." }, { status: 400 }); update.currency = body.currency; }
    if (body.initialBalance !== undefined) { const amount = Number(body.initialBalance); if (!Number.isFinite(amount)) return NextResponse.json({ error: "Check the initial balance." }, { status: 400 }); update.initial_balance = amount; }
    if (typeof body.archived === "boolean") update.archived_at = body.archived ? new Date().toISOString() : null;
    if (!Object.keys(update).length) return NextResponse.json({ error: "No account changes were supplied." }, { status: 400 });
    const { data, error } = await getSupabaseServerClient().from("accounts").update(update).eq("id", accountId).eq("user_id", user.id).select("id").maybeSingle();
    if (error) throw error; if (!data) throw new AccessError("Account not found.", 404);
    return NextResponse.json({ account: data });
  } catch (error) { return response(error); }
}
