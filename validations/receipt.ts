import { z } from "zod";

export const MAX_RECEIPT_BODY_BYTES = 16 * 1024;

const money = z.number().finite().nonnegative().max(999_999_999_999.99);
const hasCardNumber = (value: string) => /\d{12,19}/.test(value.replace(/[ -]/g, ""));
const text = (max: number) => z.string().trim().min(1).max(max).refine((value) => !hasCardNumber(value), "Remove card numbers.");
function isRealDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const itemSchema = z.object({
  name: text(120),
  quantity: z.number().finite().positive().max(99_999),
  unitPrice: money,
  lineTotal: money,
}).strict();

export const scannedReceiptSchema = z.object({
  title: text(160).refine((value) => value.length >= 2, "Enter a short description."),
  category: z.string().uuid(),
  account: z.union([z.literal(""), z.string().uuid()]).optional().transform((value) => value || null),
  receipt: z.object({
    scanId: z.string().uuid(),
    merchant: text(160).nullable(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isRealDate, "Choose a valid date."),
    total: money.positive(),
    tax: money.nullable(),
    parserVersion: z.number().int().min(1).max(1000),
    edited: z.object({ merchant: z.boolean(), date: z.boolean(), total: z.boolean(), tax: z.boolean() }).strict(),
    items: z.array(itemSchema).max(100),
  }).strict().superRefine((receipt, context) => {
    if (receipt.tax !== null && receipt.tax > receipt.total) context.addIssue({ code: "custom", path: ["tax"], message: "Tax cannot exceed the total." });
    if (receipt.items.length) {
      const sum = receipt.items.reduce((total, item) => total + item.lineTotal, 0);
      if (Math.abs(sum - receipt.total) > 0.05) context.addIssue({ code: "custom", path: ["items"], message: "Items must match the total." });
    }
  }),
}).strict();

export type ScannedReceiptInput = z.infer<typeof scannedReceiptSchema>;
