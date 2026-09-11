import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BudgetBuddyScreen } from "@/components/budgetbuddy/screens";
import type { View } from "@/components/budgetbuddy/view-types";
import { syncAppUser, toAppUserIdentity } from "@/lib/auth/app-user";

type ProtectedView = Exclude<View, "landing" | "signin" | "signup">;

export async function AuthenticatedScreen({ view }: { view: ProtectedView }) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) redirect("/sign-in");

  const user = await currentUser();
  if (!user) redirect("/sign-in");

  await syncAppUser(toAppUserIdentity(user));

  return <BudgetBuddyScreen view={view} />;
}
