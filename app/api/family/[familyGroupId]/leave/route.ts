import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { leaveFamilyGroup } from "@/lib/finance/family-data";

export async function POST(_: Request, context: { params: Promise<{ familyGroupId: string }> }) {
  try {
    const user = await requireAppUser(); const { familyGroupId } = await context.params;
    await leaveFamilyGroup(user, familyGroupId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[family leave] request failed", error);
    return NextResponse.json({ error: "Unable to leave the family group." }, { status: 500 });
  }
}
