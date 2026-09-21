import type { Currency } from "@/types/finance";

const locales: Record<Currency, string> = {
  TRY: "tr-TR",
  EUR: "de-DE",
  USD: "en-US",
  GBP: "en-GB",
};

export function formatCurrency(amount: number, currency: Currency = "TRY", language?: "en" | "tr") {
  return new Intl.NumberFormat(language ? (language === "tr" ? "tr-TR" : "en-US") : locales[currency], {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(amount: number, language: "en" | "tr") {
  return amount.toLocaleString(language === "tr" ? "tr-TR" : "en-US");
}
