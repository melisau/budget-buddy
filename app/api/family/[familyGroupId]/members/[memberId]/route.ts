import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { removeFamilyMember, updateFamilyMemberRole } from "@/lib/finance/family-data";

async function params(context: { params: Promise<{ familyGroupId: string; memberId: string }> }) { return context.params; }
function errorResponse(error: unknown) {
  if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("[family member] request failed", error);
  return NextResponse.json({ error: "Unable to update the family member." }, { status: 500 });
}
export async function PATCH(request: Request, context: { params: Promise<{ familyGroupId: string; memberId: string }> }) {
  try {
    const user = await requireAppUser(); const { familyGroupId, memberId } = await params(context);
    const body = await request.json() as { role?: unknown };
    if (body.role !== "member" && body.role !== "viewer") throw new AccessError("Choose a valid family role.", 404);
    await updateFamilyMemberRole(user, familyGroupId, memberId, body.role);
    return NextResponse.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
export async function DELETE(_: Request, context: { params: Promise<{ familyGroupId: string; memberId: string }> }) {
  try {
    const user = await requireAppUser(); const { familyGroupId, memberId } = await params(context);
    await removeFamilyMember(user, familyGroupId, memberId);
    return NextResponse.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
