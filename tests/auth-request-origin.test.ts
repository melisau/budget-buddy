import assert from "node:assert/strict";
import test from "node:test";
import { sameOriginFormOrigin } from "../lib/auth/request-origin.ts";

function formRequest(url: string, headers: Record<string, string>) {
  return new Request(url, { method: "POST", headers });
}

test("accepts a browser form from its public origin behind a proxy", () => {
  const request = formRequest("http://127.0.0.1:5173/auth/submit", {
    host: "localhost:5173",
    origin: "http://localhost:5173",
    "sec-fetch-site": "same-origin",
  });
  assert.equal(sameOriginFormOrigin(request), "http://localhost:5173");
});

test("accepts a same-origin browser form when Origin is omitted", () => {
  const request = formRequest("http://localhost:5173/auth/submit", {
    host: "localhost:5173",
    "sec-fetch-site": "same-origin",
  });
  assert.equal(sameOriginFormOrigin(request), "http://localhost:5173");
});

test("rejects cross-origin and unverified form submissions", () => {
  const url = "http://localhost:5173/auth/submit";
  assert.equal(sameOriginFormOrigin(formRequest(url, {
    host: "localhost:5173", origin: "https://other.example", "sec-fetch-site": "same-origin",
  })), null);
  assert.equal(sameOriginFormOrigin(formRequest(url, {
    host: "localhost:5173", "sec-fetch-site": "cross-site",
  })), null);
  assert.equal(sameOriginFormOrigin(formRequest(url, { host: "localhost:5173" })), null);
});
