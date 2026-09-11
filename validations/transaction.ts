import { z } from "zod";

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  title: z.string().trim().min(2, "Enter a short description."),
  category: z.string().min(1, "Choose a category."),
  account: z.string().min(1, "Choose an account."),
  date: z.string().min(1, "Choose a date."),
  note: z.string().trim().max(500, "Note can contain at most 500 characters.").optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
