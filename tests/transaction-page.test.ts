import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeCursor, encodeCursor, readPageQuery } from "../lib/finance/transaction-page.ts";

const cursor = { date: "2026-11-24", createdAt: "2026-11-24T10:00:00.123456+00:00", id: "11111111-1111-4111-8111-111111111111" };

test("a cursor round-trips", () => {
  assert.deepEqual(decodeCursor(encodeCursor(cursor)), cursor);
});

test("rejects tampered cursors", () => {
  assert.equal(decodeCursor("not-a-cursor"), null);
  assert.equal(decodeCursor(encodeCursor({ ...cursor, id: "1; drop table" })), null);
});

test("keeps the old full list when no limit is given", () => {
  assert.equal(readPageQuery(new URLSearchParams("")), null);
});

test("reads a page request", () => {
  const page = readPageQuery(new URLSearchParams(`limit=50&q=%20market%20&cursor=${encodeCursor(cursor)}`));
  assert.deepEqual(page, { limit: 50, cursor, query: "market" });
});

test("rejects bad limits, cursors and long searches", () => {
  for (const query of ["limit=0", "limit=101", "limit=abc", "limit=10&cursor=bad", `limit=10&q=${"a".repeat(101)}`]) {
    assert.equal(readPageQuery(new URLSearchParams(query)), "invalid", query);
  }
});
