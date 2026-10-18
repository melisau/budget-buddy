import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const PRIVATE_PATHS = [
  "/api/",
  "/__clerk/",
  "/auth/",
  "/dashboard",
  "/accounts",
  "/analytics",
  "/assistant",
  "/budgets",
  "/family",
  "/goals",
  "/settings",
  "/transactions",
];

export default function robots(): MetadataRoute.Robots {
  // Only production should be indexed; previews would duplicate content.
  const isProduction = !process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production";
  return {
    rules: isProduction
      ? [{ userAgent: "*", allow: "/", disallow: PRIVATE_PATHS }]
      : [{ userAgent: "*", disallow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
