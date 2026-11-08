"use client";

import { useContext, type ReactNode } from "react";
import { LanguageContext } from "@/components/providers/language-provider";

type Copy = { eyebrow: string; title: string; body: string };

/** Shared layout for the 404 and error pages, in the visitor's language. */
export function StatusPage({ copy, children }: { copy: Record<"en" | "tr", Copy>; children: (language: "en" | "tr") => ReactNode }) {
  const { language } = useContext(LanguageContext);
  const text = copy[language];
  return (
    <main className="app-error" id="main-content" tabIndex={-1}>
      <p>{text.eyebrow}</p>
      <h1>{text.title}</h1>
      <span>{text.body}</span>
      <div>{children(language)}</div>
    </main>
  );
}
