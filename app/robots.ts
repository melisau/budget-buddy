import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const PRIVATE_PATHS = [
  "/api/",
  "/forgot-password",
  "/update-password",
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
  "/w/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE_PATHS }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
