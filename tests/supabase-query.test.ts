import assert from "node:assert/strict";
import { test } from "node:test";
import { escapeLikePattern, fetchAllRows, PAGE_SIZE } from "../lib/supabase/query.ts";

// Behaves like PostgREST with max_rows = 1000: a larger range is silently cut.
function fakeTable(total: number, failAtFrom?: number) {
  const ranges: number[] = [];
  const build = () => ({
    order: (column: string) => {
      assert.equal(column, "id");
      return {
        range: async (from: number, to: number) => {
          ranges.push(from);
          if (from === failAtFrom) return { data: null, error: { message: "failed" } };
          const end = Math.min(total, to + 1, from + PAGE_SIZE);
          return { data: Array.from({ length: Math.max(0, end - from) }, (_, index) => ({ amount: from + index })), error: null };
        },
      };
    },
  });
  return { build, ranges };
}

for (const total of [0, 1, 999, 1000, 1001, 5000, 20_000]) {
  test(`reads all ${total} rows past the 1000-row limit`, async () => {
    const { build } = fakeTable(total);
    const { data, error } = await fetchAllRows<{ amount: number }>(build);
    assert.equal(error, null);
    assert.equal(data.length, total);
    assert.equal(new Set(data.map((row) => row.amount)).size, total);
  });
}

test("a failed page returns the error and no partial total", async () => {
  const { build } = fakeTable(5000, 2000);
  const { data, error } = await fetchAllRows(build);
  assert.deepEqual(data, []);
  assert.deepEqual(error, { message: "failed" });
});

test("like wildcards in an e-mail match literally", () => {
  assert.equal(escapeLikePattern("a_b@example.test"), "a\\_b@example.test");
  assert.equal(escapeLikePattern("100%\\x@example.test"), "100\\%\\\\x@example.test");
  assert.equal(escapeLikePattern("plain@example.test"), "plain@example.test");
});
