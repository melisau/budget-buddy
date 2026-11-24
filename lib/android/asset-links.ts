/** Android package published on Google Play. Keep in sync with apps/mobile/android/app/build.gradle.kts. */
export const ANDROID_PACKAGE_NAME = "com.melisauyar.budgetbuddy";

const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

/**
 * Parses ANDROID_CERT_SHA256: comma-separated SHA-256 certificate
 * fingerprints (Play App Signing key, and optionally the upload key for
 * locally installed builds). Invalid entries are ignored.
 */
export function parseFingerprints(value: string | undefined): string[] {
  return [...new Set((value ?? "")
    .split(/[\s,]+/)
    .map((item) => item.trim().toUpperCase())
    .filter((item) => FINGERPRINT.test(item)))];
}

/**
 * Digital Asset Links statement that ties the site to the Android app signed
 * with these certificates.
 */
export function assetLinks(fingerprints: string[], packageName = ANDROID_PACKAGE_NAME) {
  if (fingerprints.length === 0) return [];
  return [{
    relation: ["delegate_permission/common.handle_all_urls"],
    target: { namespace: "android_app", package_name: packageName, sha256_cert_fingerprints: fingerprints },
  }];
}
