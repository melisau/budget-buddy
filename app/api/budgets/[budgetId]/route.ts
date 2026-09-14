import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ budgetId: string }> };
type BudgetInput = { categoryId?: unknown; amountLimit?: unknown };

function errorResponse(error: unknown) {
  if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("[budgets] request failed", error);
  return NextResponse.json({ error: "Unable to process the budget request." }, { status: 500 });
}

async function requireOwnedBudget(userId: string, budgetId: string) {
  const { data, error } = await getSupabaseServerClient()
    .from("budgets")
    .select("id")
    .eq("id", budgetId)
    .eq("user_id", userId)
    .is("family_group_id", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AccessError("Budget not found.", 404);
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireAppUser();
    const { budgetId } = await context.params;
    await requireOwnedBudget(user.id, budgetId);
    const input = await request.json() as BudgetInput;
    const amountLimit = Number(input.amountLimit);
    const categoryId = typeof input.categoryId === "string" ? input.categoryId : "";
    if (!categoryId || !Number.isFinite(amountLimit) || amountLimit <= 0) {
      return NextResponse.json({ error: "Choose a category and valid amount." }, { status: 400 });
    }

    const { data: category, error: categoryError } = await getSupabaseServerClient()
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .eq("type", "expense")
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .maybeSingle();
    if (categoryError) throw categoryError;
    if (!category) throw new AccessError("Select one of your expense categories.", 404);

    const { error } = await getSupabaseServerClient()
      .from("budgets")
      .update({ category_id: categoryId, amount_limit: amountLimit })
      .eq("id", budgetId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_: Request, context: Context) {
  try {
    const user = await requireAppUser();
    const { budgetId } = await context.params;
    await requireOwnedBudget(user.id, budgetId);
    const { error } = await getSupabaseServerClient().from("budgets").delete().eq("id", budgetId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
