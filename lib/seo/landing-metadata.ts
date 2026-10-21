import type { Metadata } from "next";
import type { Language } from "@/components/providers/language-provider";
import { LANDING_ALTERNATES, landingPath } from "@/lib/seo/i18n";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const LANDING_COPY = {
  tr: {
    title: "BudgetBuddy — Ücretsiz bütçe ve harcama takip uygulaması",
    description: "Gelir ve giderlerini takip et, aylık bütçe planla, birikim hedeflerine ulaş, aile bütçeni paylaş ve harcamalarını yapay zekâ ile anlamlandır. Türkçe ve İngilizce, ücretsiz.",
    locale: "tr_TR",
    alternateLocale: "en_US",
  },
  en: {
    title: "BudgetBuddy — Free budgeting and expense tracker app",
    description: "Track income and expenses, plan monthly budgets, reach savings goals, share family finances and understand your spending with AI. Turkish and English, free.",
    locale: "en_US",
    alternateLocale: "tr_TR",
  },
} as const;

export function landingMetadata(language: Language): Metadata {
  const copy = LANDING_COPY[language];
  const path = landingPath(language);
  return {
    // absolute: the root layout title template would otherwise add the name twice.
    title: { absolute: copy.title },
    description: copy.description,
    alternates: { canonical: path, languages: { ...LANDING_ALTERNATES } },
    openGraph: {
      type: "website",
      url: path,
      siteName: SITE_NAME,
      title: copy.title,
      description: copy.description,
      locale: copy.locale,
      alternateLocale: [copy.alternateLocale],
    },
    twitter: { card: "summary_large_image", title: copy.title, description: copy.description },
  };
}

/** schema.org graph: the site, its publisher and the app itself. */
export function landingStructuredData(language: Language) {
  const copy = LANDING_COPY[language];
  const url = `${SITE_URL}${landingPath(language) === "/" ? "" : "/en"}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: ["tr", "en"],
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: { "@type": "ImageObject", url: `${SITE_URL}/apple-icon`, width: 180, height: 180 },
        email: "budgetbuddy.main.info@gmail.com",
      },
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: copy.title,
        description: copy.description,
        inLanguage: language,
        isPartOf: { "@id": `${SITE_URL}/#website` },
      },
      {
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        url,
        description: copy.description,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        inLanguage: ["tr", "en"],
        offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" },
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };
}

