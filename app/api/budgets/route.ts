import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { getBudgetStatus, calculateBudgetUsage } from "@/lib/finance/calculations";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ensureDefaultCategories } from "@/lib/finance/default-categories";

type BudgetInput = {
  categoryId?: unknown;
  amountLimit?: unknown;
  month?: unknown;
};

function errorResponse(error: unknown) {
  if (error instanceof AccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("[budgets] request failed", error);
  return NextResponse.json({ error: "Unable to process the budget request." }, { status: 500 });
}

function monthRange(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [year, month] = value.split("-").map(Number);
  if (month < 1 || month > 12) return null;

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function budgetPayload(input: BudgetInput) {
  const categoryId = typeof input.categoryId === "string" ? input.categoryId : "";
  const amountLimit = Number(input.amountLimit);
  const range = monthRange(input.month);

  if (!categoryId || !Number.isFinite(amountLimit) || amountLimit <= 0 || !range) {
    return null;
  }

  return { categoryId, amountLimit, ...range };
}

async function requireExpenseCategory(userId: string, categoryId: string) {
  const { data, error } = await getSupabaseServerClient()
    .from("categories")
    .select("id")
    .eq("id", categoryId)
    .eq("type", "expense")
    .or(`user_id.eq.${userId},user_id.is.null`)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new AccessError("Select one of your expense categories.", 404);
}

export async function GET(request: Request) {
  try {
    const user = await requireAppUser();
    await ensureDefaultCategories(user.id);
    const supabase = getSupabaseServerClient();
    const requestedMonth = new URL(request.url).searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
    const selectedRange = monthRange(requestedMonth) ?? monthRange(new Date().toISOString().slice(0, 7))!;
    const [{ data: budgets, error: budgetsError }, { data: categories, error: categoriesError }, userResult] = await Promise.all([
      supabase
        .from("budgets")
        .select("id, category_id, amount_limit, start_date, end_date, category:categories(id, name)")
        .eq("user_id", user.id)
        .is("family_group_id", null)
        .eq("start_date", selectedRange.startDate)
        .order("start_date", { ascending: false }),
      supabase
        .from("categories")
        .select("id, name")
        .eq("type", "expense")
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order("name"),
      supabase.from("users").select("currency").eq("id", user.id).single(),
    ]);

    if (budgetsError || categoriesError || userResult.error) throw budgetsError ?? categoriesError ?? userResult.error;

    const earliestStart = budgets?.reduce<string | null>((earliest, budget) =>
      !earliest || budget.start_date < earliest ? budget.start_date : earliest, null) ?? null;
    const { data: expenses, error: expensesError } = earliestStart
      ? await supabase
        .from("transactions")
        .select("category_id, amount, transaction_date")
        .eq("user_id", user.id)
        .is("family_group_id", null)
        .eq("type", "expense")
        .gte("transaction_date", earliestStart)
      : { data: [], error: null };

    if (expensesError) throw expensesError;

    const summaries = (budgets ?? []).map((budget) => {
      const spent = (expenses ?? []).reduce((total, expense) => {
        const inPeriod = expense.category_id === budget.category_id
          && expense.transaction_date >= budget.start_date
          && (!budget.end_date || expense.transaction_date <= budget.end_date);
        return inPeriod ? total + Number(expense.amount) : total;
      }, 0);
      const limit = Number(budget.amount_limit);
      const usage = calculateBudgetUsage({ category: "", spent, limit });
      const category = Array.isArray(budget.category) ? budget.category[0] : budget.category;

      return {
        id: budget.id,
        categoryId: budget.category_id,
        categoryName: category?.name ?? "Uncategorized",
        limit,
        spent,
        remaining: limit - spent,
        usage,
        status: getBudgetStatus(usage),
        startDate: budget.start_date,
        endDate: budget.end_date,
      };
    });

    return NextResponse.json({ budgets: summaries, categories: categories ?? [], month: selectedRange.startDate.slice(0, 7), currency: userResult.data.currency });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    await ensureDefaultCategories(user.id);
    const payload = budgetPayload(await request.json() as BudgetInput);
    if (!payload) {
      return NextResponse.json({ error: "Choose a category, monthly amount, and valid month." }, { status: 400 });
    }

    await requireExpenseCategory(user.id, payload.categoryId);
    const { data, error } = await getSupabaseServerClient()
      .from("budgets")
      .insert({
        user_id: user.id,
        category_id: payload.categoryId,
        amount_limit: payload.amountLimit,
        start_date: payload.startDate,
        end_date: payload.endDate,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "A budget for this category and month already exists." }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ budget: data }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
