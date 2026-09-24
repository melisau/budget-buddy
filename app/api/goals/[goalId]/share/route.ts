import { NextResponse } from "next/server";
import { AccessError, getAcceptedFamilyRole, requireAppUser } from "@/lib/auth/authorization";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ goalId: string }> };
function fail(error: unknown) {
  if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("[goal share] request failed", error);
  return NextResponse.json({ error: "Unable to update goal sharing." }, { status: 500 });
}

export async function PUT(request: Request, context: Context) {
  try {
    const user = await requireAppUser();
    const { goalId } = await context.params;
    const body = await request.json() as { familyGroupId?: unknown; shared?: unknown };
    if (typeof body.familyGroupId !== "string" || typeof body.shared !== "boolean") return NextResponse.json({ error: "Invalid sharing choice." }, { status: 400 });
    const supabase = getSupabaseServerClient();
    const [goal, role] = await Promise.all([
      supabase.from("goals").select("id").eq("id", goalId).eq("user_id", user.id).is("family_group_id", null).maybeSingle(),
      getAcceptedFamilyRole(user.id, body.familyGroupId),
    ]);
    if (goal.error) throw goal.error;
    if (!goal.data || !role) throw new AccessError("Goal or family not found.", 404);
    if (body.shared) {
      const { error } = await supabase.from("goal_shares").upsert({ goal_id: goalId, family_group_id: body.familyGroupId, shared_by_user_id: user.id });
      if (error) throw error;
    } else {
      const { error } = await supabase.from("goal_shares").delete().eq("goal_id", goalId).eq("family_group_id", body.familyGroupId).eq("shared_by_user_id", user.id);
      if (error) throw error;
    }
    return NextResponse.json({ shared: body.shared });
  } catch (error) { return fail(error); }
}
