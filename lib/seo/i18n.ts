/** Landing pages exist in Turkish (/), English (/en) and German (/de). */
export type Language = "tr" | "en" | "de";

/** Turkish is the primary market, so it lives at the root URL. */
export const DEFAULT_LANGUAGE: Language = "tr";

export function landingPath(language: string): "/" | "/en" | "/de" {
  return language === "tr" ? "/" : language === "de" ? "/de" : "/en";
}

/** Request header the proxy sets on landing pages; the root layout reads it for <html lang>. */
export const PAGE_LANGUAGE_HEADER = "x-budgetbuddy-page-language";

export const LANDING_LANGUAGE_BY_PATH: Readonly<Record<string, Language>> = { "/": "tr", "/en": "en", "/de": "de" };

/** <html lang> for the server HTML: the landing page's language, else English (the client then applies the user's choice). */
export function pageLanguage(header: string | null | undefined): Language {
  return header === "tr" || header === "en" || header === "de" ? header : "en";
}

/** hreflang alternates shared by both landing pages and the sitemap. */
export const LANDING_ALTERNATES = { tr: "/", en: "/en", de: "/de", "x-default": "/" } as const;

/** Cookie set when a visitor picks a landing language, so "/" stops guessing. */
export const LANDING_LANGUAGE_COOKIE = "budgetbuddy-landing";

/**
 * The landing page a first-time visitor to "/" should see, from the browser's
 * Accept-Language (the language set on the device, which follows where people
 * live). Turkish stays at "/"; German speakers go to /de, other languages /en.
 * Returns null to stay on "/".
 */
export function preferredLandingPath(acceptLanguage: string | null | undefined): "/en" | "/de" | null {
  if (!acceptLanguage) return null;
  const ranked = acceptLanguage.split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().toLowerCase().split(";");
      const q = Number(params.find((p) => p.trim().startsWith("q="))?.split("=")[1] ?? 1);
      return { lang: tag.split("-")[0], q: Number.isFinite(q) ? q : 0, index };
    })
    .filter((item) => item.lang && item.lang !== "*" && item.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  const first = ranked[0]?.lang;
  if (!first || first === "tr") return null;
  return first === "de" ? "/de" : "/en";
}
