import { OG_SIZE, renderOpenGraphImage } from "@/lib/seo/og-image";

export const alt = "BudgetBuddy — Free budgeting and expense tracker app";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderOpenGraphImage("en");
}
