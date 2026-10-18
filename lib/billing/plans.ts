export const PLANS = {
  free: { name: "Free", features: ["Manual tracking", "Basic dashboard", "Personal goals", "Family wishlists", "Shared shopping list", "Allowance plan"] },
  core: { name: "Core", features: ["Multiple accounts", "CSV import", "Advanced reports"], priceEnv: "STRIPE_CORE_PRICE_ID" },
  pro: { name: "Pro", features: ["AI Assistant", "Voice input", "Advanced reports"], priceEnv: "STRIPE_PRO_PRICE_ID" },
} as const;

export type PlanId = keyof typeof PLANS;
