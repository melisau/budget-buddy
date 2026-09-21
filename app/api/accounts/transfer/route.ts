import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = await request.json() as Record<string, unknown>;
    const fromAccountId = typeof body.fromAccountId === "string" ? body.fromAccountId : "";
    const toAccountId = typeof body.toAccountId === "string" ? body.toAccountId : "";
    const amount = Number(body.amount); const receivedAmount = Number(body.receivedAmount ?? body.amount);
    const date = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : "";
    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(receivedAmount) || receivedAmount <= 0 || !date) return NextResponse.json({ error: "Check the transfer fields." }, { status: 400 });
    const supabase = getSupabaseServerClient();
    const [{ data: accounts, error: accountsError }, categoriesResult] = await Promise.all([
      supabase.from("accounts").select("id, name, currency").eq("user_id", user.id).is("archived_at", null).in("id", [fromAccountId, toAccountId]),
      supabase.from("categories").upsert([{ user_id: user.id, name: "Transfer out", type: "expense" }, { user_id: user.id, name: "Transfer in", type: "income" }], { onConflict: "user_id,name,type" }).select("id, name"),
    ]);
    if (accountsError || categoriesResult.error) throw accountsError ?? categoriesResult.error;
    const from = accounts?.find((item) => item.id === fromAccountId); const to = accounts?.find((item) => item.id === toAccountId);
    if (!from || !to) throw new AccessError("One of the transfer accounts is unavailable.", 404);
    const outgoingCategory = categoriesResult.data?.find((item) => item.name === "Transfer out"); const incomingCategory = categoriesResult.data?.find((item) => item.name === "Transfer in");
    if (!outgoingCategory || !incomingCategory) throw new Error("Transfer categories could not be prepared.");
    const transferGroupId = crypto.randomUUID();
    const { error } = await supabase.from("transactions").insert([
      { user_id: user.id, owner_user_id: user.id, created_by_user_id: user.id, account_id: from.id, category_id: outgoingCategory.id, type: "expense", amount, title: `Transfer to ${to.name}`, transaction_date: date, transfer_group_id: transferGroupId },
      { user_id: user.id, owner_user_id: user.id, created_by_user_id: user.id, account_id: to.id, category_id: incomingCategory.id, type: "income", amount: receivedAmount, title: `Transfer from ${from.name}`, transaction_date: date, transfer_group_id: transferGroupId },
    ]);
    if (error) throw error;
    return NextResponse.json({ transferId: transferGroupId }, { status: 201 });
  } catch (error) { if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status }); console.error("[accounts] transfer failed", error); return NextResponse.json({ error: "Unable to save the transfer." }, { status: 500 }); }
}
