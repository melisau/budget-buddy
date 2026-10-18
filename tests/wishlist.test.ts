import assert from "node:assert/strict";
import test from "node:test";
import { safeProductUrl, visibleWishlistItem } from "../lib/finance/wishlist.ts";
import { PLANS } from "../lib/billing/plans.ts";

test("surprise mode never sends reservation state to its owner", () => {
  const item = { id: "wish", name: "Book", note: "Blue cover", product_url: null, reserved_by_user_id: "giver" };
  assert.deepEqual(visibleWishlistItem(item, "owner", "owner", true), { id: "wish", name: "Book", note: "Blue cover", productUrl: null, reserved: null, reservedByMe: false });
  assert.equal(visibleWishlistItem(item, "owner", "other", true).reserved, true);
  assert.equal(visibleWishlistItem(item, "owner", "giver", true).reservedByMe, true);
  assert.equal(visibleWishlistItem(item, "owner", "owner", false).reserved, true);
});

test("wish links accept only ordinary web URLs", () => {
  assert.equal(safeProductUrl("javascript:alert(1)"), undefined);
  assert.equal(safeProductUrl("data:text/html,hello"), undefined);
  assert.equal(safeProductUrl("https://example.com/gift"), "https://example.com/gift");
  assert.equal(safeProductUrl(""), null);
});

test("wishlists and first goals belong to the free plan", () => {
  assert.ok(PLANS.free.features.includes("Family wishlists"));
  assert.ok(PLANS.free.features.includes("Personal goals"));
});
