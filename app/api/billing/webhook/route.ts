import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { planForSubscription, subscriptionEndsAt, toSubscriptionStatus, trialEndsAt } from "@/lib/billing/subscription";
import { getSupabaseServerClient } from "@/lib/supabase/server";

async function updateSubscription(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const { error } = await getSupabaseServerClient().from("users").update({
    plan: planForSubscription(subscription),
    subscription_plan: planForSubscription(subscription),
    subscription_status: toSubscriptionStatus(subscription.status),
    stripe_subscription_id: subscription.id,
    trial_ends_at: trialEndsAt(subscription),
    subscription_ends_at: subscriptionEndsAt(subscription),
  }).eq("stripe_customer_id", customerId);
  if (error) throw error;
}

async function recordInvoice(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const supabase = getSupabaseServerClient();
  const userResult = await supabase.from("users").select("id").eq("stripe_customer_id", customerId).maybeSingle();
  if (userResult.error) throw userResult.error;
  if (!userResult.data) return;

  const subscription = invoice.parent?.subscription_details?.subscription;
  const subscriptionId = typeof subscription === "string" ? subscription : subscription?.id;
  const periodEnd = invoice.lines.data[0]?.period?.end;
  const { error } = await supabase.from("billing_invoices").upsert({
    user_id: userResult.data.id,
    stripe_invoice_id: invoice.id,
    stripe_subscription_id: subscriptionId,
    amount_paid: invoice.amount_paid / 100,
    currency: invoice.currency.toUpperCase(),
    status: invoice.status ?? "open",
    invoice_url: invoice.hosted_invoice_url,
    paid_at: invoice.status_transitions.paid_at ? new Date(invoice.status_transitions.paid_at * 1000).toISOString() : null,
    period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  }, { onConflict: "stripe_invoice_id" });
  if (error) throw error;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: "Webhook signature verification is unavailable." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await updateSubscription(event.data.object as Stripe.Subscription);
        break;
      case "invoice.paid":
      case "invoice.payment_failed":
        await recordInvoice(event.data.object as Stripe.Invoice);
        break;
      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[billing webhook] processing failed", error);
    return NextResponse.json({ error: "Unable to process billing event." }, { status: 500 });
  }
}
