import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth/authorization";
import { isFullAccess, toSubscriptionStatus } from "@/lib/billing/subscription";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const user = await requireAppUser();
    const supabase = getSupabaseServerClient();
    const [userResult, invoicesResult] = await Promise.all([
      supabase.from("users").select("subscription_plan, subscription_status, trial_ends_at, subscription_ends_at, stripe_customer_id").eq("id", user.id).single(),
      supabase.from("billing_invoices").select("stripe_invoice_id, amount_paid, currency, status, invoice_url, paid_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(12),
    ]);

    if (userResult.error) throw userResult.error;
    if (invoicesResult.error) throw invoicesResult.error;

    const status = toSubscriptionStatus(userResult.data.subscription_status);
    return NextResponse.json({
      subscription: {
        plan: userResult.data.subscription_plan,
        status,
        trialEndsAt: userResult.data.trial_ends_at,
        endsAt: userResult.data.subscription_ends_at,
        fullAccess: isFullAccess(status, userResult.data.trial_ends_at),
        canManage: Boolean(userResult.data.stripe_customer_id),
      },
      invoices: invoicesResult.data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load billing details.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
