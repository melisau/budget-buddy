import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/auth-page";

export const metadata: Metadata = { title: "Create your free account", description: "Start using BudgetBuddy for free: track spending, budgets, savings goals and family finances in Turkish or English.", alternates: { canonical: "/sign-up" } };

export default async function Page({ searchParams }: { searchParams: Promise<{ redirect?: string; error?: string; status?: string }> }) {
	const { redirect, error, status } = await searchParams;
	return <AuthPage mode="sign-up" errorCode={error} status={status} redirectTo={redirect === "/family" ? "/family" : "/dashboard"} />;
}
