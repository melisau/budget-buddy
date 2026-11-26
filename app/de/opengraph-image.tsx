import { OG_SIZE, renderOpenGraphImage } from "@/lib/seo/og-image";

export const alt = "BudgetBuddy — Kostenlose App für Budget und Ausgaben";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOpenGraphImage("de");
}
