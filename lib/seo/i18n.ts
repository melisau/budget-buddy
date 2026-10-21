import type { Language } from "@/components/providers/language-provider";

/** Turkish is the primary market, so it lives at the root URL. */
export const DEFAULT_LANGUAGE: Language = "tr";

export function landingPath(language: Language): "/" | "/en" {
  return language === "en" ? "/en" : "/";
}

/** hreflang alternates shared by both landing pages and the sitemap. */
export const LANDING_ALTERNATES = { tr: "/", en: "/en", "x-default": "/" } as const;
