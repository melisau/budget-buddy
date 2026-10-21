import { OG_SIZE, renderOpenGraphImage } from "@/lib/seo/og-image";

export const alt = "BudgetBuddy — Ücretsiz bütçe ve harcama takip uygulaması";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOpenGraphImage("tr");
}
