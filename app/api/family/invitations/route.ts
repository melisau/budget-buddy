import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { createFamilyInvite, listPendingFamilyInvites } from "@/lib/finance/family-data";

export async function GET() {
  try {
    return NextResponse.json({ invitations: await listPendingFamilyInvites(await requireAppUser()) });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[family invitations] request failed", error);
    return NextResponse.json({ error: "Unable to load family invitations." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = await request.json() as { familyGroupId?: unknown; email?: unknown; role?: unknown };
    if (typeof body.familyGroupId !== "string" || typeof body.email !== "string" || (body.role !== "member" && body.role !== "viewer")) {
      throw new AccessError("Please check the invitation fields.", 404);
    }
    const invitationId = await createFamilyInvite(user, body.familyGroupId, body.email, body.role);
    return NextResponse.json({ invitationId }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[family invitation] request failed", error);
    return NextResponse.json({ error: "Unable to create the family invitation." }, { status: 500 });
  }
}
