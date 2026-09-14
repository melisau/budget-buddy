import { getSupabaseServerClient } from "@/lib/supabase/server";

const defaultCategories = [
  ["Salary", "income"], ["Freelance income", "income"], ["Investment income", "income"], ["Gift income", "income"], ["Other income", "income"],
  ["Housing", "expense"], ["Groceries", "expense"], ["Dining", "expense"], ["Transport", "expense"], ["Utilities", "expense"],
  ["Health", "expense"], ["Education", "expense"], ["Entertainment", "expense"], ["Shopping", "expense"], ["Subscriptions", "expense"],
  ["Personal care", "expense"], ["Travel", "expense"], ["Insurance", "expense"], ["Debt payments", "expense"], ["Gifts", "expense"], ["Other expenses", "expense"],
] as const;

export async function ensureDefaultCategories(userId: string) {
  const { error } = await getSupabaseServerClient().from("categories").upsert(
    defaultCategories.map(([name, type]) => ({ user_id: userId, name, type })),
    { onConflict: "user_id,name,type", ignoreDuplicates: true },
  );
  if (error) throw new Error(`Unable to prepare categories: ${error.message}`);
}
