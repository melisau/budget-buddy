"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { LandingScreen } from "@/components/budgetbuddy/landing-screen";
import { VIEW_PATHS } from "@/components/budgetbuddy/view-paths";
import type { View } from "@/components/budgetbuddy/view-types";
import { hasSavedLanguage, LanguageContext, readLanguage, setLanguage as setGlobalLanguage, type Language } from "@/components/providers/language-provider";
import { landingPath } from "@/lib/seo/i18n";

/**
 * The landing page language comes from the URL ("/" Turkish, "/en" English),
 * not from browser storage, so search engines index each language at its own
 * address. Switching language navigates to the other URL.
 */
export function LandingPage({ language }: { language: Language }) {
  const router = useRouter();
  const go = useCallback((view: View) => router.push(VIEW_PATHS[view]), [router]);
  const switchLanguage = useCallback((next: Language) => {
    setGlobalLanguage(next);
    if (next !== language) router.push(landingPath(next));
  }, [language, router]);

  // A first-time visitor's app language follows the landing page they came from.
  useEffect(() => { if (!hasSavedLanguage()) setGlobalLanguage(language); }, [language]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dataset.langLocked = "true";
    return () => {
      delete root.dataset.langLocked;
      root.lang = readLanguage();
    };
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage: switchLanguage }), [language, switchLanguage]);
  return <LanguageContext.Provider value={value}><LandingScreen go={go} /></LanguageContext.Provider>;
}
