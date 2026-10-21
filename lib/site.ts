/**
 * Canonical public URL of the site, used for metadata, sitemap and robots.
 * Order: explicit NEXT_PUBLIC_SITE_URL (set this when a custom domain is
 * added), then Vercel's production domain, then the custom domain.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProduction) return `https://${vercelProduction.replace(/\/+$/, "")}`;
  return "https://budgetbuddy.melisauyar.com";
}

export const SITE_URL = resolveSiteUrl();
export const SITE_NAME = "BudgetBuddy";
export const SITE_TITLE = "BudgetBuddy — Personal finance, made clear";
export const SITE_DESCRIPTION =
  "Free bilingual (Turkish/English) personal finance app: track income and expenses, plan budgets, reach savings goals, share family finances and get AI explanations of your spending.";
export const BRAND_COLOR = "#4258d5";

/** Public, indexable pages. Everything else is private or an API. */
export const PUBLIC_ROUTES = ["/", "/en", "/sign-up", "/privacy", "/terms", "/account-deletion"] as const;
