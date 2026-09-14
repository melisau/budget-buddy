import type { AppUser } from "@/lib/auth/authorization";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type CsvTransactionInput = { title: string; category: string; accountName: string; transactionDate: string; amount: number; type: "income" | "expense" };

const normal = (value: string) => value.trim().toLocaleLowerCase("tr-TR");

export async function importPersonalCsvTransactions(user: AppUser, rows: CsvTransactionInput[]) {
  if (!rows.length) return { imported: 0, duplicates: 0 };
  if (rows.length > 500) throw new Error("A maximum of 500 rows can be imported at once.");
  const supabase = getSupabaseServerClient();
  const [accountsResult, categoriesResult, existingResult] = await Promise.all([
    supabase.from("accounts").select("id, name").eq("user_id", user.id),
    supabase.from("categories").select("id, name, type").eq("user_id", user.id),
    supabase.from("transactions").select("title, amount, type, transaction_date, account_id").eq("user_id", user.id).is("family_group_id", null),
  ]);
  for (const result of [accountsResult, categoriesResult, existingResult]) if (result.error) throw new Error(`Unable to prepare the CSV import: ${result.error.message}`);
  const accounts = new Map((accountsResult.data ?? []).map((item) => [normal(item.name), item.id]));
  const categories = new Map((categoriesResult.data ?? []).map((item) => [`${item.type}:${normal(item.name)}`, item.id]));
  const existing = new Set((existingResult.data ?? []).map((item) => `${item.account_id}|${item.type}|${item.amount}|${item.transaction_date}|${normal(item.title)}`));
  const inserts: Record<string, unknown>[] = [];
  let duplicates = 0;
  for (const row of rows) {
    const accountId = accounts.get(normal(row.accountName));
    const categoryId = categories.get(`${row.type}:${normal(row.category)}`);
    if (!accountId || !categoryId) throw new Error(`Row "${row.title}" has an unknown account or category.`);
    const key = `${accountId}|${row.type}|${row.amount}|${row.transactionDate}|${normal(row.title)}`;
    if (existing.has(key)) { duplicates += 1; continue; }
    existing.add(key);
    inserts.push({ user_id: user.id, owner_user_id: user.id, created_by_user_id: user.id, account_id: accountId, category_id: categoryId, type: row.type, amount: row.amount, title: row.title.trim(), transaction_date: row.transactionDate, note: "Imported from CSV" });
  }
  if (inserts.length) { const { error } = await supabase.from("transactions").insert(inserts); if (error) throw new Error(`Unable to import the CSV rows: ${error.message}`); }
  return { imported: inserts.length, duplicates };
}
