"use client";

import { SignUp } from "@clerk/react";

export default function Page() {
	return (
		<main className="flex min-h-screen items-center justify-center px-4 py-8">
			<SignUp fallbackRedirectUrl="/dashboard" forceRedirectUrl="/dashboard" />
		</main>
	);
}
