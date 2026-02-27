import { z } from "zod";
import type { Transaction } from "../../models/transaction";
import { TransactionType } from "../../models/transaction";
import { toDateString } from "../../types/date";

export const transactionSchema = z.object({
  userId: z.uuid(),
  id: z.uuid(),
  accountId: z.uuid(),
  categoryId: z.uuid().optional(),
  type: z.enum(TransactionType),
  amount: z.number().positive(),
  currency: z.string().length(3).uppercase(),
  date: z.iso.date().transform(toDateString), // Store as YYYY-MM-DD string
  description: z.string().optional(),
  transferId: z.uuid().optional(),
  isArchived: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}) satisfies z.ZodType<Transaction>;

// Database item schema extends Transaction schema with createdAtSortable
export const transactionDbItemSchema = transactionSchema.extend({
  createdAtSortable: z.string().min(1),
});

export type TransactionDbItem = z.infer<typeof transactionDbItemSchema>;
