/**
 * Paid plans are off: no payment provider is connected yet (see MB-26).
 * While this is false every user has full access. Do not set
 * NEXT_PUBLIC_BILLING_ENABLED=true until a provider is integrated and verified.
 * Public variables are inlined at build time, so redeploy after changing it.
 */
export const BILLING_ENABLED = process.env.NEXT_PUBLIC_BILLING_ENABLED === "true";
