import { z } from "zod";
import { TransactionType } from "../../models/transaction";
import { toDateString } from "../../types/date";

// Database item schema: adds createdAtSortable
export const transactionDbItemSchema = z.object({
  userId: z.uuid(),
  id: z.uuid(),
  accountId: z.uuid(),
  categoryId: z.uuid().optional(),
  type: z.enum(TransactionType),
  amount: z.number().positive(),
  currency: z.string().length(3).uppercase(),
  date: z.iso.date().transform(toDateString),
  description: z.string().optional(),
  transferId: z.uuid().optional(),
  isArchived: z.boolean(),
  version: z.int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  createdAtSortable: z.string().min(1),
});

export type TransactionDbItem = z.infer<typeof transactionDbItemSchema>;
