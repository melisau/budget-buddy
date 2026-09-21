"use client";

import { useT } from "@/components/providers/language-provider";

export function SkipLink() {
  const t = useT();
  return <a className="skip-link" href="#main-content">{t("Skip to main content")}</a>;
}
