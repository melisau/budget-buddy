import type { Language } from "@/components/providers/language-provider";

/** Turkish is the primary market, so it lives at the root URL. */
export const DEFAULT_LANGUAGE: Language = "tr";

export function landingPath(language: Language): "/" | "/en" {
  return language === "en" ? "/en" : "/";
}

/** Request header the proxy sets on landing pages; the root layout reads it for <html lang>. */
export const PAGE_LANGUAGE_HEADER = "x-budgetbuddy-page-language";

export const LANDING_LANGUAGE_BY_PATH: Readonly<Record<string, Language>> = { "/": "tr", "/en": "en" };

/** <html lang> for the server HTML: the landing page's language, else English (the client then applies the user's choice). */
export function pageLanguage(header: string | null | undefined): Language {
  return header === "tr" || header === "en" ? header : "en";
}

/** hreflang alternates shared by both landing pages and the sitemap. */
export const LANDING_ALTERNATES = { tr: "/", en: "/en", "x-default": "/" } as const;
