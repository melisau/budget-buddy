import { NextResponse } from "next/server";
import { z } from "zod";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { createCategoryRule, listCategoryRules, RuleInputError } from "@/lib/finance/category-rules-service";
import { checkRateLimit } from "@/lib/security/rate-limit";

const ruleSchema = z.object({
  keyword: z.string().max(200),
  type: z.enum(["income", "expense"]),
  categoryId: z.string().uuid(),
});

function fail(error: unknown) {
  if (error instanceof RuleInputError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && error.name === "ZodError") return NextResponse.json({ error: "Please check the fields." }, { status: 400 });
  console.error("[category rules] request failed", error);
  return NextResponse.json({ error: "Unable to process the category rule request." }, { status: 500 });
}

export async function GET() {
  try {
    return NextResponse.json(await listCategoryRules(await requireAppUser()));
  } catch (error) { return fail(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const limit = await checkRateLimit(`category-rules:${user.id}`, 30, 60_000);
    if (!limit.allowed) return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
    const id = await createCategoryRule(user, ruleSchema.parse(await request.json()));
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) { return fail(error); }
}
