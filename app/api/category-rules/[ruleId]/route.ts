import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { deleteCategoryRule } from "@/lib/finance/category-rules-service";

type Context = { params: Promise<{ ruleId: string }> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await requireAppUser();
    const { ruleId } = await context.params;
    if (!uuid.test(ruleId) || !await deleteCategoryRule(user, ruleId)) throw new AccessError("Rule not found.", 404);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[category rules] delete failed", error);
    return NextResponse.json({ error: "Unable to delete the rule." }, { status: 500 });
  }
}
