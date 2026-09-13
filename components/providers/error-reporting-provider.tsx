"use client";

import { useEffect } from "react";

type ClientError = { message: string; stack?: string; source: "client" | "boundary" };

export function reportClientError(error: unknown, source: ClientError["source"] = "client") {
  const value = error instanceof Error ? error : new Error(typeof error === "string" ? error : "Unknown client error");
  const payload: ClientError & { path: string } = {
    source,
    message: value.message,
    stack: value.stack,
    path: window.location.pathname,
  };
  void fetch("/api/errors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), keepalive: true }).catch(() => undefined);
}

export function ErrorReportingProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const onError = (event: ErrorEvent) => reportClientError(event.error ?? event.message);
    const onUnhandledRejection = (event: PromiseRejectionEvent) => reportClientError(event.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);
  return children;
}
