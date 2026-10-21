import type { MetadataRoute } from "next";
import { LANDING_ALTERNATES } from "@/lib/seo/i18n";
import { SITE_URL } from "@/lib/site";

const LAST_CONTENT_UPDATE = new Date("2026-10-21");
const absolute = (path: string) => `${SITE_URL}${path === "/" ? "" : path}`;
const landingLanguages = Object.fromEntries(
  Object.entries(LANDING_ALTERNATES).map(([language, path]) => [language, absolute(path)]),
);

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absolute("/"), lastModified: LAST_CONTENT_UPDATE, changeFrequency: "weekly", priority: 1, alternates: { languages: landingLanguages } },
    { url: absolute("/en"), lastModified: LAST_CONTENT_UPDATE, changeFrequency: "weekly", priority: 0.9, alternates: { languages: landingLanguages } },
    { url: absolute("/sign-up"), lastModified: LAST_CONTENT_UPDATE, changeFrequency: "monthly", priority: 0.6 },
    { url: absolute("/privacy"), lastModified: LAST_CONTENT_UPDATE, changeFrequency: "yearly", priority: 0.3 },
    { url: absolute("/terms"), lastModified: LAST_CONTENT_UPDATE, changeFrequency: "yearly", priority: 0.3 },
    { url: absolute("/account-deletion"), lastModified: LAST_CONTENT_UPDATE, changeFrequency: "yearly", priority: 0.2 },
  ];
}
