import type { Language } from "@/lib/seo/i18n";

/**
 * Landing page FAQ. The page shows the English text through the shared
 * translation table; the FAQPage structured data needs both languages on the
 * server, so the Turkish text is kept here too. tests/seo.test.ts checks that
 * both copies stay the same.
 */
export const LANDING_FAQ = [
  {
    en: ["Do I need a CSV?", "No. Manual transaction entry is always available."],
    tr: ["CSV dosyası gerekli mi?", "Hayır. İşlemleri her zaman elle ekleyebilirsin."],
    de: ["Brauche ich eine CSV?", "Nein. Transaktionen lassen sich immer manuell eingeben."],
  },
  {
    en: ["Does BudgetBuddy move money?", "No. BudgetBuddy organizes your information and cannot move funds."],
    tr: ["BudgetBuddy para transferi yapar mı?", "Hayır. BudgetBuddy yalnızca bilgilerinizi düzenler ve para transferi yapamaz."],
    de: ["Bewegt BudgetBuddy Geld?", "Nein. BudgetBuddy ordnet deine Informationen und kann kein Geld bewegen."],
  },
  {
    en: ["Is AI financial advice?", "No. It summarizes your tracked data and budgeting patterns."],
    tr: ["AI finansal tavsiye verir mi?", "Hayır. Yalnızca takip ettiğin verileri ve bütçe alışkanlıklarını özetler."],
    de: ["Ist die KI eine Finanzberatung?", "Nein. Sie fasst deine erfassten Daten und Budgetmuster zusammen."],
  },
  {
    en: ["Does it work on mobile?", "Yes. Every view adapts to mobile screens."],
    tr: ["Mobilde çalışır mı?", "Evet. Tüm ekranlar mobil cihazlara uyum sağlar."],
    de: ["Funktioniert es auf dem Handy?", "Ja. Jede Ansicht passt sich an mobile Bildschirme an."],
  },
] as const satisfies readonly Record<Language, readonly [string, string]>[];
