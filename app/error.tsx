"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/components/providers/error-reporting-provider";
import { StatusPage } from "@/components/budgetbuddy/status-page";
import { localized } from "@/lib/i18n/localized";

const copy = {
  en: { eyebrow: "Something went wrong", title: "We could not load this page.", body: "Try again. If the problem continues, return to your dashboard." },
  tr: { eyebrow: "Bir sorun oluştu", title: "Bu sayfa yüklenemedi.", body: "Tekrar dene. Sorun devam ederse genel bakış sayfasına dön." },
  de: { eyebrow: "Etwas ist schiefgelaufen", title: "Diese Seite konnte nicht geladen werden.", body: "Versuche es erneut. Wenn das Problem bleibt, kehre zur Übersicht zurück." },
};

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(error, "boundary");
  }, [error]);

  return (
    <StatusPage copy={copy}>
      {(language) => (
        <>
          <Button onClick={reset}>{language === "tr" ? "Tekrar dene" : localized("Try again")}</Button>
          <Button variant="outline" asChild><a href="/dashboard">{language === "tr" ? "Genel bakışa git" : localized("Go to dashboard")}</a></Button>
        </>
      )}
    </StatusPage>
  );
}
