"use client";

import { Button } from "@/components/ui/button";
import { StatusPage } from "@/components/budgetbuddy/status-page";
import { landingPath } from "@/lib/seo/i18n";

const copy = {
  en: { eyebrow: "404", title: "Page not found", body: "The page you are looking for does not exist or has moved." },
  tr: { eyebrow: "404", title: "Sayfa bulunamadı", body: "Aradığın sayfa yok ya da taşınmış olabilir." },
};

export default function NotFound() {
  return (
    <StatusPage copy={copy}>
      {(language) => (
        <>
          <Button asChild><a href="/dashboard">{language === "tr" ? "Genel bakışa git" : "Go to dashboard"}</a></Button>
          <Button variant="outline" asChild><a href={landingPath(language)}>{language === "tr" ? "Ana sayfa" : "Home page"}</a></Button>
        </>
      )}
    </StatusPage>
  );
}
