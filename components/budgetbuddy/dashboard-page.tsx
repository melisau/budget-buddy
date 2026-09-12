"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardScreen } from "@/components/budgetbuddy/dashboard-screen";
import { VIEW_PATHS } from "@/components/budgetbuddy/view-paths";
import type { View } from "@/components/budgetbuddy/view-types";

export function DashboardPage() {
  const router = useRouter();
  const go = useCallback((view: View) => router.push(VIEW_PATHS[view]), [router]);
  return <DashboardScreen go={go} />;
}
