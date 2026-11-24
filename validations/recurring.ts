import { z } from "zod";
import { frequencies, parseReminderDays, type Frequency } from "@/lib/finance/recurring";
import type { RecurringInput } from "@/lib/finance/recurring-service";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.");
const emptyToUndefined = (value: string | undefined) => value || undefined;

export const recurringRequestSchema = z.object({
  kind: z.enum(["regular", "subscription"]),
  type: z.enum(["income", "expense"]),
  title: z.string().trim().min(2, "Enter a short name.").max(120, "Name can contain at most 120 characters."),
  amount: z.coerce.number().positive("Amount must be greater than zero.").max(1_000_000_000),
  category: z.string().uuid("Choose a valid category."),
  account: z.union([z.literal(""), z.string().uuid("Choose a valid account.")]).optional().transform(emptyToUndefined),
  frequency: z.enum(frequencies as unknown as [string, ...string[]]),
  startDate: date,
  endDate: z.union([z.literal(""), date]).optional().transform(emptyToUndefined),
  // "" or missing: no reminder, the transaction is created automatically.
  reminderDays: z.union([z.literal(""), z.null(), z.coerce.number().int()]).optional(),
  // "" = private; a group id = shown to that family group as an upcoming payment.
  sharedFamilyGroupId: z.union([z.literal(""), z.null(), z.string().uuid()]).optional(),
}).refine((value) => value.kind === "regular" || value.type === "expense", { message: "A subscription is an expense.", path: ["type"] })
  .refine((value) => !value.endDate || value.endDate >= value.startDate, { message: "The end date must be after the start date.", path: ["endDate"] });

export const recurringActiveSchema = z.object({ active: z.boolean() });

/** Validates a request body and turns it into the service input. Throws a ZodError when it is invalid. */
export function toRecurringInput(body: unknown): RecurringInput {
  const payload = recurringRequestSchema.parse(body);
  return {
    kind: payload.kind, type: payload.type, title: payload.title, amount: payload.amount,
    categoryId: payload.category, accountId: payload.account, frequency: payload.frequency as Frequency,
    startDate: payload.startDate, endDate: payload.endDate, reminderDays: parseReminderDays(payload.reminderDays),
    sharedFamilyGroupId: payload.sharedFamilyGroupId === undefined ? undefined : payload.sharedFamilyGroupId || null,
  };
}

export const recurringSettleSchema = z.object({ date, paid: z.boolean() });
