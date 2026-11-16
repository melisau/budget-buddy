import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { deleteRecurring, setRecurringActive, updateRecurring } from "@/lib/finance/recurring-service";
import { recurringActiveSchema, toRecurringInput } from "@/validations/recurring";

type Context = { params: Promise<{ recurringId: string }> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(error: unknown) {
  if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && error.name === "ZodError") return NextResponse.json({ error: "Please check the fields." }, { status: 400 });
  console.error("[recurring] request failed", error);
  return NextResponse.json({ error: "Unable to process the recurring item request." }, { status: 500 });
}

async function target(context: Context) {
  const user = await requireAppUser();
  const { recurringId } = await context.params;
  if (!uuid.test(recurringId)) throw new AccessError("Recurring item not found.", 404);
  return { user, id: recurringId };
}

/** Body `{ active }` pauses or resumes; a full item replaces its fields. */
export async function PATCH(request: Request, context: Context) {
  try {
    const { user, id } = await target(context);
    const body = await request.json();
    const toggle = recurringActiveSchema.safeParse(body);
    if (toggle.success) {
      if (!await setRecurringActive(user, id, toggle.data.active)) throw new AccessError("Recurring item not found.", 404);
      return NextResponse.json({ ok: true });
    }
    const item = await updateRecurring(user, id, toRecurringInput(body));
    if (!item) throw new AccessError("Recurring item not found.", 404);
    return NextResponse.json({ item });
  } catch (error) { return fail(error); }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { user, id } = await target(context);
    if (!await deleteRecurring(user, id)) throw new AccessError("Recurring item not found.", 404);
    return NextResponse.json({ ok: true });
  } catch (error) { return fail(error); }
}
