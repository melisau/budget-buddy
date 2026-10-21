"use client";

import type { ReactNode } from "react";
import { useCallback, useContext } from "react";
import { LanguageContext } from "@/components/providers/language-provider";
import { landingPath } from "@/lib/seo/i18n";
import { usePathname, useRouter } from "next/navigation";
import { AddTransaction } from "@/components/budgetbuddy/shared";
import { VIEW_PATHS } from "@/components/budgetbuddy/view-paths";
import { AppHeader, AppSidebar, MobileNavigation, type AppView } from "@/components/layout/app-navigation";

const PATH_VIEWS: Record<string, AppView> = {
  "/dashboard": "dashboard",
  "/family": "family",
  "/wishlists": "wishlists",
  "/transactions": "transactions",
  "/budgets": "budgets",
  "/accounts": "accounts",
  "/goals": "goals",
  "/analytics": "analytics",
  "/assistant": "assistant",
  "/settings": "settings",
};

export function ProtectedShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const view = PATH_VIEWS[pathname] ?? "dashboard";
  const { language } = useContext(LanguageContext);
  const go = useCallback((next: AppView | "landing") => router.push(next === "landing" ? landingPath(language) : VIEW_PATHS[next]), [language, router]);
  const prefetch = useCallback((next: AppView) => router.prefetch(VIEW_PATHS[next]), [router]);

  return <div className="shell">
    <AppSidebar view={view} go={go} prefetch={prefetch} />
    <main className="work" id="main-content" tabIndex={-1}><AppHeader view={view} quickAdd={<AddTransaction />} /><div className="content">{children}</div></main>
    <MobileNavigation view={view} go={go} prefetch={prefetch} />
  </div>;
}
