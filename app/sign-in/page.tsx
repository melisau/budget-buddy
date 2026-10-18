import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/auth-page";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: true } };

export default async function Page({ searchParams }: { searchParams: Promise<{ redirect?: string; error?: string }> }) {
	const { redirect, error } = await searchParams;
	return <AuthPage mode="sign-in" errorCode={error} redirectTo={redirect === "/family" ? "/family" : "/dashboard"} />;
}
