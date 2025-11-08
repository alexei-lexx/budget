import { z } from "zod";
import type { Transaction } from "../../models/Transaction";
import { TransactionType } from "../../models/Transaction";

export const transactionSchema = z.object({
  userId: z.uuid(),
  id: z.uuid(),
  accountId: z.uuid(),
  categoryId: z.uuid().optional(),
  type: z.enum(TransactionType),
  amount: z.number().positive(),
  currency: z.string().length(3).uppercase(),
  date: z.iso.date(),
  description: z.string().optional(),
  transferId: z.uuid().optional(),
  isArchived: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}) satisfies z.ZodType<Transaction>;

export type { Transaction, TransactionType };
