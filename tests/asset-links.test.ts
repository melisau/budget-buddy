import assert from "node:assert/strict";
import test from "node:test";
import { ANDROID_PACKAGE_NAME, assetLinks, parseFingerprints } from "../lib/android/asset-links.ts";

const valid = Array.from({ length: 32 }, (_, index) => index.toString(16).padStart(2, "0")).join(":");

test("fingerprints are normalized, deduplicated and validated", () => {
  assert.deepEqual(parseFingerprints(`${valid}, ${valid.toUpperCase()}\nnot-a-fingerprint`), [valid.toUpperCase()]);
  assert.deepEqual(parseFingerprints(undefined), []);
});

test("asset links statement matches the Android package", () => {
  assert.deepEqual(assetLinks([]), []);
  const [statement] = assetLinks([valid.toUpperCase()]);
  assert.deepEqual(statement.relation, ["delegate_permission/common.handle_all_urls"]);
  assert.equal(statement.target.package_name, ANDROID_PACKAGE_NAME);
  assert.deepEqual(statement.target.sha256_cert_fingerprints, [valid.toUpperCase()]);
});
