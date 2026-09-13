import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth/authorization";
import { getStripe } from "@/lib/billing/stripe";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const { data, error } = await getSupabaseServerClient().from("users").select("stripe_customer_id").eq("id", user.id).single();
    if (error) throw error;
    if (!data.stripe_customer_id) return NextResponse.json({ error: "No billing account is available yet." }, { status: 400 });

    const session = await getStripe().billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${new URL(request.url).origin}/settings`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to open the billing portal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
