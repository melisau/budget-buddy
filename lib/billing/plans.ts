export const PLANS = {
  free: { name: "Free", features: ["Manual tracking", "Basic dashboard", "Personal goals", "Family wishlists", "Shared shopping list", "Allowance plan"] },
  core: { name: "Core", features: ["Multiple accounts", "CSV import", "Advanced reports"] },
  pro: { name: "Pro", features: ["AI Assistant", "Voice input", "Advanced reports"] },
} as const;

export type PlanId = keyof typeof PLANS;
