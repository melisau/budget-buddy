/**
 * Paid plans are off until Stripe is configured and verified in production.
 * Set NEXT_PUBLIC_BILLING_ENABLED=true (and the Stripe variables) to turn the
 * checkout flow and paid-plan pricing back on. Public variables are inlined at
 * build time, so redeploy after changing it.
 */
export const BILLING_ENABLED = process.env.NEXT_PUBLIC_BILLING_ENABLED === "true";
