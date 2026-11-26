import type { Currency } from "@/types/finance";
import { localeOf, type Language } from "@/lib/i18n/localized";

const locales: Record<Currency, string> = {
  TRY: "tr-TR",
  EUR: "de-DE",
  USD: "en-US",
  GBP: "en-GB",
};

export function formatCurrency(amount: number, currency: Currency = "TRY", language?: Language) {
  return new Intl.NumberFormat(language ? localeOf(language) : locales[currency], {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(amount: number, language: Language) {
  return amount.toLocaleString(localeOf(language));
}
