import { NextResponse } from "next/server";
import { assetLinks, parseFingerprints } from "@/lib/android/asset-links";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(assetLinks(parseFingerprints(process.env.ANDROID_CERT_SHA256)), {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
