"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/components/providers/error-reporting-provider";
import { useT } from "@/components/providers/language-provider";

export default function ProtectedError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => reportClientError(error, "boundary"), [error]);
  return <main className="app-error" role="alert">
    <p>{t("Something went wrong")}</p>
    <h1>{t("This page could not be opened.")}</h1>
    <span>{t("The error was recorded. You can try again or return to the dashboard.")}</span>
    <div><Button onClick={reset}>{t("Try again")}</Button><Button variant="outline" onClick={() => window.location.assign("/dashboard")}>{t("Dashboard")}</Button></div>
  </main>;
}
