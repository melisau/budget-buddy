import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { createFamilyGroup, listFamilyGroups } from "@/lib/finance/family-data";

function errorResponse(error: unknown) {
  if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("[family] request failed", error);
  return NextResponse.json({ error: "Unable to process the family request." }, { status: 500 });
}

export async function GET() {
  try {
    return NextResponse.json({ groups: await listFamilyGroups(await requireAppUser()) });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = await request.json() as { name?: unknown; currency?: unknown };
    if (typeof body.name !== "string") throw new AccessError("Enter a family name.", 404);
    const currency = typeof body.currency === "string" && ["TRY", "EUR", "USD", "GBP"].includes(body.currency) ? body.currency : "TRY";
    const groupId = await createFamilyGroup(user, body.name, currency);
    return NextResponse.json({ groupId }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
