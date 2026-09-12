"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { LandingScreen } from "@/components/budgetbuddy/landing-screen";
import { VIEW_PATHS } from "@/components/budgetbuddy/view-paths";
import type { View } from "@/components/budgetbuddy/view-types";

export function LandingPage() {
  const router = useRouter();
  const go = useCallback((view: View) => router.push(VIEW_PATHS[view]), [router]);
  return <LandingScreen go={go} />;
}
