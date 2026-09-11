import { SignIn } from "@clerk/nextjs";

export default function Page() {
	return (
		<main className="flex min-h-screen items-center justify-center px-4 py-8">
			<SignIn fallbackRedirectUrl="/dashboard" forceRedirectUrl="/dashboard" />
		</main>
	);
}
