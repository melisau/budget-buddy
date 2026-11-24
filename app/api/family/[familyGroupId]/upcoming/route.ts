import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { listFamilyUpcoming } from "@/lib/finance/recurring-service";

type Context = { params: Promise<{ familyGroupId: string }> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Upcoming payments members chose to show to this family group. */
export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireAppUser();
    const { familyGroupId } = await context.params;
    if (!uuid.test(familyGroupId)) throw new AccessError("Family group not found.", 404);
    const response = NextResponse.json({ upcoming: await listFamilyUpcoming(user, familyGroupId) });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[family upcoming] request failed", error);
    return NextResponse.json({ error: "Unable to load upcoming payments." }, { status: 500 });
  }
}
