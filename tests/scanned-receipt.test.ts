import assert from "node:assert/strict";
import { test } from "node:test";
import { scannedReceiptSchema } from "../validations/receipt.ts";

const valid = {
  title: "Örnek Market",
  category: "11111111-1111-4111-8111-111111111111",
  account: "",
  receipt: {
    scanId: "22222222-2222-4222-8222-222222222222",
    merchant: "ÖRNEK MARKET",
    date: "2026-11-23",
    total: 100,
    tax: 10,
    parserVersion: 1,
    edited: { merchant: false, date: true, total: false, tax: false },
    items: [{ name: "SÜT", quantity: 2, unitPrice: 50, lineTotal: 100 }],
  },
};
const withReceipt = (change: object) => ({ ...valid, receipt: { ...valid.receipt, ...change } });

test("accepts a confirmed receipt and treats an empty account as none", () => {
  const parsed = scannedReceiptSchema.parse(valid);
  assert.equal(parsed.account, null);
});

test("rejects items that do not match the total", () => {
  assert.equal(scannedReceiptSchema.safeParse(withReceipt({ total: 120 })).success, false);
});

test("rejects card numbers in stored text", () => {
  assert.equal(scannedReceiptSchema.safeParse(withReceipt({ merchant: "4111 1111 1111 1111" })).success, false);
});

test("rejects an impossible date and extra fields such as raw OCR text", () => {
  assert.equal(scannedReceiptSchema.safeParse(withReceipt({ date: "2026-02-31" })).success, false);
  assert.equal(scannedReceiptSchema.safeParse(withReceipt({ rawText: "receipt" })).success, false);
});

test("rejects more than 100 items", () => {
  const items = Array.from({ length: 101 }, () => ({ name: "A", quantity: 1, unitPrice: 1, lineTotal: 1 }));
  assert.equal(scannedReceiptSchema.safeParse(withReceipt({ total: 101, items })).success, false);
});
