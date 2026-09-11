"use client";

import { useRouter } from "next/navigation";
import { Auth } from "@/components/auth/auth-screen";
import { AccountsScreen } from "@/components/budgetbuddy/accounts-screen";
import { AnalyticsScreen } from "@/components/budgetbuddy/analytics-screen";
import { AssistantScreen } from "@/components/budgetbuddy/assistant-screen";
import { BudgetsScreen } from "@/components/budgetbuddy/budgets-screen";
import { DashboardScreen } from "@/components/budgetbuddy/dashboard-screen";
import { FamilyScreen } from "@/components/budgetbuddy/family-screen";
import { GoalsScreen } from "@/components/budgetbuddy/goals-screen";
import { LandingScreen } from "@/components/budgetbuddy/landing-screen";
import { SettingsScreen } from "@/components/budgetbuddy/settings-screen";
import { AddTransaction } from "@/components/budgetbuddy/shared";
import { TransactionsScreen } from "@/components/budgetbuddy/transactions-screen";
import type { View } from "@/components/budgetbuddy/view-types";
import { AppHeader, AppSidebar, MobileNavigation, type AppView } from "@/components/layout/app-navigation";

function Shell({ view, go }: { view: View; go: (view: View) => void }) {
  const appView = view as AppView;
  return <div className="shell">
    <AppSidebar view={appView} go={go} />
    <main className="work"><AppHeader view={appView} quickAdd={<AddTransaction />} /><div className="content"><Page view={view} go={go} /></div></main>
    <MobileNavigation view={appView} go={go} />
  </div>;
}

function Page({ view, go }: { view: View; go: (view: View) => void }) {
  if (view === "dashboard") return <DashboardScreen go={go} />;
  if (view === "family") return <FamilyScreen />;
  if (view === "transactions") return <TransactionsScreen />;
  if (view === "budgets") return <BudgetsScreen />;
  if (view === "accounts") return <AccountsScreen />;
  if (view === "goals") return <GoalsScreen />;
  if (view === "analytics") return <AnalyticsScreen />;
  if (view === "assistant") return <AssistantScreen />;
  return <SettingsScreen />;
}

const viewPaths: Record<View, string> = {
  landing: "/",
  signin: "/sign-in",
  signup: "/sign-up",
  dashboard: "/dashboard",
  family: "/family",
  transactions: "/transactions",
  budgets: "/budgets",
  accounts: "/accounts",
  goals: "/goals",
  analytics: "/analytics",
  assistant: "/assistant",
  settings: "/settings",
};

export function BudgetBuddyScreen({ view }: { view: View }) {
  const router = useRouter();
  const go = (next: View) => router.push(viewPaths[next]);
  if (view === "landing") return <LandingScreen go={go} />;
  if (view === "signin" || view === "signup") return <Auth mode={view} go={go} />;
  return <Shell view={view} go={go} />;
}
