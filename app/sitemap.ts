import type { MetadataRoute } from "next";
import { LEGAL_LAST_UPDATED_ISO } from "@/lib/legal";
import { LANDING_ALTERNATES } from "@/lib/seo/i18n";
import { SITE_URL } from "@/lib/site";

// When a page's visible content changes, update its date here so search
// engines know to fetch it again. The privacy page uses the date it shows.
const UPDATED = {
  landing: "2026-11-16",
  signUp: "2026-11-13",
  privacy: LEGAL_LAST_UPDATED_ISO,
  terms: "2026-10-18",
  accountDeletion: "2026-10-21",
} as const;

const absolute = (path: string) => `${SITE_URL}${path === "/" ? "" : path}`;
const landingLanguages = Object.fromEntries(
  Object.entries(LANDING_ALTERNATES).map(([language, path]) => [language, absolute(path)]),
);

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absolute("/"), lastModified: new Date(UPDATED.landing), changeFrequency: "weekly", priority: 1, alternates: { languages: landingLanguages } },
    { url: absolute("/en"), lastModified: new Date(UPDATED.landing), changeFrequency: "weekly", priority: 0.9, alternates: { languages: landingLanguages } },
    { url: absolute("/de"), lastModified: new Date(UPDATED.landing), changeFrequency: "weekly", priority: 0.9, alternates: { languages: landingLanguages } },
    { url: absolute("/sign-up"), lastModified: new Date(UPDATED.signUp), changeFrequency: "monthly", priority: 0.6 },
    { url: absolute("/privacy"), lastModified: new Date(UPDATED.privacy), changeFrequency: "yearly", priority: 0.3 },
    { url: absolute("/terms"), lastModified: new Date(UPDATED.terms), changeFrequency: "yearly", priority: 0.3 },
    { url: absolute("/account-deletion"), lastModified: new Date(UPDATED.accountDeletion), changeFrequency: "yearly", priority: 0.2 },
  ];
}
