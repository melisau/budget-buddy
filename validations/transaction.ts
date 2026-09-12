import { z } from "zod";

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  title: z.string().trim().min(2, "Enter a short description.").max(160, "Description can contain at most 160 characters."),
  category: z.string().min(1, "Choose a category."),
  account: z.string().min(1, "Choose an account."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date."),
  note: z.string().trim().max(500, "Note can contain at most 500 characters.").optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

export const transactionRequestSchema = transactionSchema.extend({
  account: z.string().uuid("Choose a valid account."),
  category: z.string().uuid("Choose a valid category."),
  familyGroupId: z.string().uuid().optional(),
  ownerUserId: z.string().uuid().optional(),
});
