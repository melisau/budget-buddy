import { redirect } from "next/navigation";
import { BudgetBuddyScreen } from "@/components/budgetbuddy/screens";
import type { View } from "@/components/budgetbuddy/view-types";
import { syncAppUser, toAppUserIdentity } from "@/lib/auth/app-user";
import { getClerkAuth, getCurrentClerkUser } from "@/lib/auth/clerk-server";

type ProtectedView = Exclude<View, "landing" | "signin" | "signup">;

export async function AuthenticatedScreen({ view }: { view: ProtectedView }) {
  const { isAuthenticated, userId } = await getClerkAuth();
  if (!isAuthenticated || !userId) redirect("/sign-in");

  const user = await getCurrentClerkUser(userId);

  await syncAppUser(toAppUserIdentity(user));

  return <BudgetBuddyScreen view={view} />;
}
