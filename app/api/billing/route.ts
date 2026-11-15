import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth/authorization";
import { BILLING_ENABLED } from "@/lib/billing/launch";
import { isMissingBillingSchemaError } from "@/lib/billing/schema-errors";
import { isFullAccess, toSubscriptionStatus } from "@/lib/billing/subscription";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const user = await requireAppUser();
    const userResult = await getSupabaseServerClient()
      .from("users")
      .select("subscription_plan, subscription_status, trial_ends_at, subscription_ends_at")
      .eq("id", user.id)
      .single();

    if (isMissingBillingSchemaError(userResult.error) && !BILLING_ENABLED) {
      // Billing migrations are not applied here; report the free launch state.
      return NextResponse.json({
        billingEnabled: false,
        subscription: { plan: "free", status: "inactive", trialEndsAt: null, endsAt: null, fullAccess: true },
      });
    }
    if (userResult.error) throw userResult.error;

    const status = toSubscriptionStatus(userResult.data.subscription_status);
    return NextResponse.json({
      billingEnabled: BILLING_ENABLED,
      subscription: {
        plan: userResult.data.subscription_plan,
        status,
        trialEndsAt: userResult.data.trial_ends_at,
        endsAt: userResult.data.subscription_ends_at,
        // Everyone has full access while paid plans are switched off.
        fullAccess: !BILLING_ENABLED || isFullAccess(status, userResult.data.trial_ends_at),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load billing details.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
