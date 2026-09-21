import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ goalId: string }> };
type GoalInput = { name?: unknown; targetAmount?: unknown; currentAmount?: unknown; addAmount?: unknown; deadline?: unknown };
const select = "id, name, target_amount, current_amount, deadline, created_at";
const errorResponse = (error: unknown) => error instanceof AccessError ? NextResponse.json({ error: error.message }, { status: error.status }) : NextResponse.json({ error: "Unable to update the goal." }, { status: 500 });

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireAppUser(); const { goalId } = await context.params; const body = await request.json() as GoalInput; const supabase = getSupabaseServerClient();
    const { data: existing, error: lookupError } = await supabase.from("goals").select(select).eq("id", goalId).eq("user_id", user.id).is("family_group_id", null).maybeSingle();
    if (lookupError) throw lookupError; if (!existing) throw new AccessError("Goal not found.", 404);
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) { const name = typeof body.name === "string" ? body.name.trim() : ""; if (name.length < 2 || name.length > 100) return NextResponse.json({ error: "Enter a valid goal name." }, { status: 400 }); update.name = name; }
    if (body.targetAmount !== undefined) { const target = Number(body.targetAmount); if (!Number.isFinite(target) || target <= 0) return NextResponse.json({ error: "Enter a valid target amount." }, { status: 400 }); update.target_amount = target; }
    if (body.currentAmount !== undefined) { const current = Number(body.currentAmount); if (!Number.isFinite(current) || current < 0) return NextResponse.json({ error: "Enter a valid saved amount." }, { status: 400 }); update.current_amount = current; }
    if (body.addAmount !== undefined) { const addition = Number(body.addAmount); if (!Number.isFinite(addition) || addition <= 0) return NextResponse.json({ error: "Enter a valid progress amount." }, { status: 400 }); update.current_amount = Number(existing.current_amount) + addition; }
    if (body.deadline !== undefined) { if (body.deadline === "" || body.deadline === null) update.deadline = null; else if (typeof body.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.deadline)) update.deadline = body.deadline; else return NextResponse.json({ error: "Enter a valid target date." }, { status: 400 }); }
    if (!Object.keys(update).length) return NextResponse.json({ error: "No goal changes were supplied." }, { status: 400 });
    const { data, error } = await supabase.from("goals").update(update).eq("id", goalId).eq("user_id", user.id).is("family_group_id", null).select(select).single();
    if (error) throw error; return NextResponse.json({ goal: data });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(_: Request, context: Context) {
  try { const user = await requireAppUser(); const { goalId } = await context.params; const { error, count } = await getSupabaseServerClient().from("goals").delete({ count: "exact" }).eq("id", goalId).eq("user_id", user.id).is("family_group_id", null); if (error) throw error; if (!count) throw new AccessError("Goal not found.", 404); return new NextResponse(null, { status: 204 }); }
  catch (error) { return errorResponse(error); }
}
