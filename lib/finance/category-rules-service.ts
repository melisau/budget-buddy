import "server-only";
import type { AppUser } from "@/lib/auth/authorization";
import { cleanKeyword, type CategoryRule, type TransactionKind } from "@/lib/finance/category-rules";
import { ensureDefaultCategories } from "@/lib/finance/default-categories";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const MAX_RULES = 200;

/** A rule request the user can fix: bad keyword or category (400) or a duplicate (409). */
export class RuleInputError extends Error {
  constructor(message: string, readonly status: 400 | 409) { super(message); }
}

/** The user's rules; empty when the migration has not been applied yet. */
export async function loadCategoryRules(userId: string): Promise<CategoryRule[]> {
  const { data, error } = await getSupabaseServerClient().from("category_rules")
    .select("id, keyword, type, category_id").eq("user_id", userId).order("created_at");
  if (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }
  return (data ?? []).map((row) => ({ id: row.id, keyword: row.keyword, type: row.type as TransactionKind, categoryId: row.category_id }));
}

export async function listCategoryRules(user: AppUser) {
  await ensureDefaultCategories(user.id);
  const supabase = getSupabaseServerClient();
  const [rules, categories] = await Promise.all([
    supabase.from("category_rules").select("id, keyword, type, category_id, category:categories(name)").eq("user_id", user.id).order("created_at"),
    supabase.from("categories").select("id, name, type").eq("user_id", user.id).order("name"),
  ]);
  if (isMissingSchemaError(rules.error)) return { available: false as const, rules: [], categories: categories.data ?? [] };
  if (rules.error) throw rules.error;
  if (categories.error) throw categories.error;
  return {
    available: true as const,
    categories: categories.data ?? [],
    rules: (rules.data ?? []).map((row) => {
      const category = Array.isArray(row.category) ? row.category[0] : row.category;
      return { id: row.id, keyword: row.keyword, type: row.type as TransactionKind, categoryId: row.category_id, categoryName: category?.name ?? "" };
    }),
  };
}

export async function createCategoryRule(user: AppUser, input: { keyword: string; type: TransactionKind; categoryId: string }) {
  const keyword = cleanKeyword(input.keyword);
  if (!keyword) throw new RuleInputError("Enter a keyword of 2 to 80 characters.", 400);
  const supabase = getSupabaseServerClient();
  const category = await supabase.from("categories").select("id, type").eq("id", input.categoryId).eq("user_id", user.id).maybeSingle();
  if (category.error) throw category.error;
  if (!category.data || category.data.type !== input.type) throw new RuleInputError("The selected category is unavailable.", 400);
  const count = await supabase.from("category_rules").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if (count.error) throw count.error;
  if ((count.count ?? 0) >= MAX_RULES) throw new RuleInputError("You can have at most 200 rules.", 400);
  const { data, error } = await supabase.from("category_rules")
    .insert({ user_id: user.id, keyword, type: input.type, category_id: input.categoryId }).select("id").single();
  if (error) {
    if (error.code === "23505") throw new RuleInputError("There is already a rule for this keyword.", 409);
    throw error;
  }
  return data.id as string;
}

export async function deleteCategoryRule(user: AppUser, id: string) {
  const { error, count } = await getSupabaseServerClient().from("category_rules").delete({ count: "exact" }).eq("id", id).eq("user_id", user.id);
  if (error) throw error;
  return (count ?? 0) > 0;
}
