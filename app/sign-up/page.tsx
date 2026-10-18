import type { Metadata } from "next";
import { ClerkAuthPage } from "@/components/auth/clerk-auth-page";

export const metadata: Metadata = { title: "Create your free account", description: "Start using BudgetBuddy for free: track spending, budgets, savings goals and family finances in Turkish or English.", alternates: { canonical: "/sign-up" } };

export default async function Page({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
	const { redirect } = await searchParams;
	return <ClerkAuthPage mode="sign-up" redirectTo={redirect === "/family" ? "/family" : "/dashboard"} />;
}
