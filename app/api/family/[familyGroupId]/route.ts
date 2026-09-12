import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { deleteFamilyGroup, transferFamilyOwnership } from "@/lib/finance/family-data";

function errorResponse(error: unknown) {
  if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("[family group] request failed", error);
  return NextResponse.json({ error: "Unable to update the family group." }, { status: 500 });
}
export async function PATCH(request: Request, context: { params: Promise<{ familyGroupId: string }> }) {
  try {
    const body = await request.json() as { transferOwnershipTo?: unknown };
    if (typeof body.transferOwnershipTo !== "string") throw new AccessError("Choose a new family owner.", 404);
    const user = await requireAppUser(); const { familyGroupId } = await context.params;
    await transferFamilyOwnership(user, familyGroupId, body.transferOwnershipTo);
    return NextResponse.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
export async function DELETE(_: Request, context: { params: Promise<{ familyGroupId: string }> }) {
  try {
    const user = await requireAppUser(); const { familyGroupId } = await context.params;
    await deleteFamilyGroup(user, familyGroupId);
    return NextResponse.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
