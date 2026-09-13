import type Stripe from "stripe";
import { PLANS, type PlanId } from "@/lib/billing/plans";

export type SubscriptionStatus = "inactive" | "trialing" | "active" | "past_due" | "canceled" | "unpaid";

const supportedStatuses = new Set<SubscriptionStatus>([
  "inactive",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
]);

export function toSubscriptionStatus(status: string | null | undefined): SubscriptionStatus {
  return status && supportedStatuses.has(status as SubscriptionStatus)
    ? status as SubscriptionStatus
    : "inactive";
}

export function planForPriceId(priceId: string | null | undefined): PlanId {
  if (priceId && priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  if (priceId && priceId === process.env.STRIPE_CORE_PRICE_ID) return "core";
  return "free";
}

export function planForSubscription(subscription: Stripe.Subscription): PlanId {
  return planForPriceId(subscription.items.data[0]?.price.id);
}

export function subscriptionEndsAt(subscription: Stripe.Subscription): string | null {
  return subscription.cancel_at
    ? new Date(subscription.cancel_at * 1000).toISOString()
    : null;
}

export function trialEndsAt(subscription: Stripe.Subscription): string | null {
  return subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;
}

export function isFullAccess(status: SubscriptionStatus, trialEndsAt: string | null): boolean {
  return status === "active" || (status === "trialing" && trialEndsAt !== null && new Date(trialEndsAt).getTime() > Date.now());
}

export function planName(plan: PlanId): string {
  return PLANS[plan].name;
}
