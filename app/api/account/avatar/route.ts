import { NextResponse } from "next/server";
import { AccessError, requireAppUser } from "@/lib/auth/authorization";
import { sameOriginFormOrigin } from "@/lib/auth/request-origin";
import { avatarMaxBytes, isAvatarIcon } from "@/lib/profile/avatar";
import { readOwnAvatar, saveOwnAvatar } from "@/lib/profile/avatar-server";
import { checkRateLimit } from "@/lib/security/rate-limit";

function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof AccessError ? error.message : "Unable to update profile picture." }, { status: error instanceof AccessError ? error.status : 500, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET() {
  try { const user = await requireAppUser(); return NextResponse.json((await readOwnAvatar(user.id)).avatar, { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { return failure(error); }
}

export async function PATCH(request: Request) {
  if (!sameOriginFormOrigin(request)) return NextResponse.json({ error: "Same-origin request required." }, { status: 403 });
  try {
    const user = await requireAppUser();
    const body = await request.json() as { icon?: unknown };
    if (!isAvatarIcon(body.icon)) return NextResponse.json({ error: "Choose an available avatar." }, { status: 400 });
    // The acting identity always comes from the session, never the payload.
    return NextResponse.json(await saveOwnAvatar(user.id, body.icon), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  if (!sameOriginFormOrigin(request)) return NextResponse.json({ error: "Same-origin request required." }, { status: 403 });
  try {
    const user = await requireAppUser();
    const limit = await checkRateLimit(`avatar-upload:${user.id}`, 10, 5 * 60 * 1000);
    if (!limit.allowed) return NextResponse.json({ error: "Please wait before uploading again." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
    if (Number(request.headers.get("content-length")) > avatarMaxBytes + 65536) return NextResponse.json({ error: "Image is too large." }, { status: 413 });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image." }, { status: 400 });
    const { validateAvatarFile } = await import("@/lib/profile/avatar");
    try { await validateAvatarFile(file); } catch { return NextResponse.json({ error: "Choose a valid JPG, PNG or WebP up to 2 MB." }, { status: 400 }); }
    return NextResponse.json(await saveOwnAvatar(user.id, file), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error); }
}
