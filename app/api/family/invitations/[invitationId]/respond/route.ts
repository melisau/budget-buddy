import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { respondToFamilyInvite } from "@/lib/finance/family-data";

export async function POST(request: Request, context: { params: Promise<{ invitationId: string }> }) {
  try {
    const user = await requireAppUser();
    const { invitationId } = await context.params;
    const body = await request.json() as { accept?: unknown };
    if (typeof body.accept !== "boolean") throw new AccessError("Choose whether to accept the invitation.", 404);
    await respondToFamilyInvite(user, invitationId, body.accept);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[family invitation response] request failed", error);
    return NextResponse.json({ error: "Unable to update the family invitation." }, { status: 500 });
  }
}
