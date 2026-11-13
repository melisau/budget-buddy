import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isMissingBillingSchemaError } from "../lib/billing/schema-errors.ts";

describe("isMissingBillingSchemaError", () => {
  test("recognises a missing column or table", () => {
    assert.equal(isMissingBillingSchemaError({ code: "42703", message: "column users.stripe_subscription_id does not exist" }), true);
    assert.equal(isMissingBillingSchemaError({ code: "42P01" }), true);
    assert.equal(isMissingBillingSchemaError({ code: "PGRST204" }), true);
    assert.equal(isMissingBillingSchemaError({ code: "PGRST205" }), true);
  });

  test("does not swallow other failures", () => {
    assert.equal(isMissingBillingSchemaError({ code: "PGRST116", message: "no rows" }), false);
    assert.equal(isMissingBillingSchemaError({ code: "57014", message: "statement timeout" }), false);
    assert.equal(isMissingBillingSchemaError(new Error("network down")), false);
    assert.equal(isMissingBillingSchemaError(null), false);
    assert.equal(isMissingBillingSchemaError(undefined), false);
  });
});
