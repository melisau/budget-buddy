import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { parseBearerCredential } from "../lib/auth/bearer.ts";

const jwt = "aaa.bbb-1.ccc_2";

describe("mobile bearer credentials", () => {
  test("reads a well-formed token, whatever the scheme casing", () => {
    for (const header of [`Bearer ${jwt}`, `bearer ${jwt}`, `  BEARER   ${jwt} `]) {
      assert.deepEqual(parseBearerCredential(header), { kind: "token", token: jwt });
    }
  });

  test("no header or another scheme leaves cookie sessions in charge", () => {
    for (const header of [null, undefined, "", "Basic abc", "Bearerish aaa.bbb.ccc"]) {
      assert.deepEqual(parseBearerCredential(header), { kind: "none" });
    }
  });

  test("a malformed bearer value is invalid, so it cannot fall back to a cookie", () => {
    for (const header of ["Bearer", "Bearer ", "Bearer abc", "Bearer a.b", "Bearer a.b.c d", "Bearer a.b.c.d", "Bearer a.b.$", `Bearer ${"a".repeat(8200)}.b.c`]) {
      assert.deepEqual(parseBearerCredential(header), { kind: "invalid" });
    }
  });

  test("the server verifies the token and rejects invalid credentials first", () => {
    const source = readFileSync("lib/auth/supabase-server.ts", "utf8");
    assert.match(source, /bearer\.kind === "invalid"\) return signedOut/);
    assert.match(source, /auth\.getUser\(bearer\.token\)/);
    assert.match(source, /secondStepPending\(data\.user\.factors, accessToken\)/);
  });
});
