"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/components/providers/error-reporting-provider";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(error, "boundary");
  }, [error]);

  return <main className="app-error" id="main-content" tabIndex={-1}><p>Something went wrong</p><h1>We could not load this page.</h1><span>Try again. If the problem continues, return to your dashboard.</span><div><Button onClick={reset}>Try again</Button><Button variant="outline" asChild><a href="/dashboard">Go to dashboard</a></Button></div></main>;
}
