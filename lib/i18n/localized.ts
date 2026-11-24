import { de } from "@/lib/i18n/de";

export type Language = "en" | "tr" | "de";
export const LANGUAGES: readonly Language[] = ["en", "tr", "de"];

export function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "tr" || value === "de";
}

// The language the UI is rendering in. LanguageProvider sets it on every render,
// before its children, so helpers below can be called without a hook.
let current: Language = "en";
export function setCurrentLanguage(language: Language) { current = language; }

/** An English UI text in the reader's language when it is not Turkish (Turkish texts are written inline). */
export function localized(english: string, language: Language = current): string {
  return language === "de" ? de[english] ?? english : english;
}

/** Intl locale for numbers and dates. */
export function localeOf(language: Language): string {
  return language === "tr" ? "tr-TR" : language === "de" ? "de-DE" : "en-US";
}

/** For texts with values inside: the German version when the reader uses German, else the English one. */
export function germanOr(german: string, english: string, language: Language = current): string {
  return language === "de" ? german : english;
}
