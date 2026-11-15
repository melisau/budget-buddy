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

export function isFullAccess(status: SubscriptionStatus, trialEndsAt: string | null): boolean {
  return status === "active" || (status === "trialing" && trialEndsAt !== null && new Date(trialEndsAt).getTime() > Date.now());
}

export function planName(plan: PlanId): string {
  return PLANS[plan].name;
}
