import type { AppUser } from "@/lib/auth/authorization";
import { matchCategoryRule } from "@/lib/finance/category-rules";
import { loadCategoryRules } from "@/lib/finance/category-rules-service";
import { ensureDefaultCategories } from "@/lib/finance/default-categories";
import { fetchAllRows } from "@/lib/supabase/query";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type CsvTransactionInput = { title: string; category: string; accountName: string; transactionDate: string; amount: number; type: "income" | "expense" };

const normal = (value: string) => value.trim().toLocaleLowerCase("tr-TR");
// What the CSV parser puts in when the file has no category column.
const unspecifiedCategories = new Set(["", "uncategorized", "kategorisiz"]);
const fallbackCategory = { income: "Other income", expense: "Other expenses" } as const;

/**
 * Imports reviewed CSV rows. A row's category is, in order: the category named
 * in the file (when the user has it), the user's first matching category rule,
 * or "Other income" / "Other expenses". A row never fails because its category
 * is unknown, and an unknown or missing account just leaves the row without one.
 */
export async function importPersonalCsvTransactions(user: AppUser, rows: CsvTransactionInput[]) {
  if (!rows.length) return { imported: 0, duplicates: 0, categorizedByRule: 0, uncategorized: 0 };
  if (rows.length > 500) throw new Error("A maximum of 500 rows can be imported at once.");
  await ensureDefaultCategories(user.id);
  const supabase = getSupabaseServerClient();
  const [accountsResult, categoriesResult, existingResult, rules] = await Promise.all([
    supabase.from("accounts").select("id, name").eq("user_id", user.id),
    supabase.from("categories").select("id, name, type").eq("user_id", user.id),
    fetchAllRows<{ title: string; amount: number; type: string; transaction_date: string; account_id: string | null }>(() => supabase.from("transactions").select("id, title, amount, type, transaction_date, account_id").eq("user_id", user.id).is("family_group_id", null)),
    loadCategoryRules(user.id),
  ]);
  const failed = accountsResult.error ?? categoriesResult.error ?? existingResult.error;
  if (failed) throw new Error(`Unable to prepare the CSV import: ${(failed as { message?: string }).message ?? "unknown error"}`);
  const accounts = new Map((accountsResult.data ?? []).map((item) => [normal(item.name), item.id]));
  const categories = new Map((categoriesResult.data ?? []).map((item) => [`${item.type}:${normal(item.name)}`, item.id]));
  const existing = new Set((existingResult.data ?? []).map((item) => `${item.account_id}|${item.type}|${item.amount}|${item.transaction_date}|${normal(item.title)}`));
  const inserts: Record<string, unknown>[] = [];
  let duplicates = 0;
  let categorizedByRule = 0;
  let uncategorized = 0;
  for (const row of rows) {
    const accountId = accounts.get(normal(row.accountName)) ?? null;
    let categoryId = unspecifiedCategories.has(normal(row.category)) ? undefined : categories.get(`${row.type}:${normal(row.category)}`);
    let byRule = false;
    if (!categoryId) {
      const rule = matchCategoryRule(row.title, row.type, rules);
      if (rule && [...categories.values()].includes(rule.categoryId)) { categoryId = rule.categoryId; byRule = true; }
    }
    let isFallback = false;
    if (!categoryId) { categoryId = categories.get(`${row.type}:${normal(fallbackCategory[row.type])}`); isFallback = true; }
    if (!categoryId) throw new Error(`Row "${row.title}" has no category and the default category is missing.`);
    const key = `${accountId}|${row.type}|${row.amount}|${row.transactionDate}|${normal(row.title)}`;
    if (existing.has(key)) { duplicates += 1; continue; }
    existing.add(key);
    if (byRule) categorizedByRule += 1;
    if (isFallback) uncategorized += 1;
    inserts.push({ user_id: user.id, owner_user_id: user.id, created_by_user_id: user.id, account_id: accountId, category_id: categoryId, type: row.type, amount: row.amount, title: row.title.trim(), transaction_date: row.transactionDate, note: "Imported from CSV" });
  }
  if (inserts.length) { const { error } = await supabase.from("transactions").insert(inserts); if (error) throw new Error(`Unable to import the CSV rows: ${error.message}`); }
  return { imported: inserts.length, duplicates, categorizedByRule, uncategorized };
}
