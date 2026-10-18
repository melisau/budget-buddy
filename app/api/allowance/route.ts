import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function fail(error: unknown) {
  if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("[allowance] request failed", error);
  return NextResponse.json({ error: "Allowance plan unavailable." }, { status: 500 });
}
export async function GET() {
  try {
    const user = await requireAppUser();
    const { data, error } = await getSupabaseServerClient().from("allowance_plans").select("monthly_amount, savings_percent").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ plan: data });
  } catch (error) { return fail(error); }
}
export async function PUT(request: Request) {
  try {
    const user = await requireAppUser();
    const body = await request.json() as { monthlyAmount?: unknown; savingsPercent?: unknown };
    const monthlyAmount = Number(body.monthlyAmount);
    const savingsPercent = Number(body.savingsPercent);
    if (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0 || monthlyAmount > 1_000_000_000 || !Number.isInteger(savingsPercent) || savingsPercent < 0 || savingsPercent > 100) return NextResponse.json({ error: "Enter a valid monthly amount and savings percentage." }, { status: 400 });
    const { data, error } = await getSupabaseServerClient().from("allowance_plans").upsert({ user_id: user.id, monthly_amount: monthlyAmount, savings_percent: savingsPercent }).select("monthly_amount, savings_percent").single();
    if (error) throw error;
    return NextResponse.json({ plan: data });
  } catch (error) { return fail(error); }
}
