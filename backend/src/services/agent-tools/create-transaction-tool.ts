import { z } from "zod";
import { TransactionType } from "../../models/transaction";
import { toDateString } from "../../types/date";
import { ToolSignature } from "../ports/agent";
import {
  CreateTransactionServiceInput,
  TransactionService,
} from "../transaction-service";

const createTransactionInputSchema = z.object({
  accountId: z.uuid().describe("Account ID to associate the transaction with"),
  amount: z.number().positive().describe("Transaction amount"),
  categoryId: z
    .uuid()
    .optional()
    .describe("Category ID to associate the transaction with"),
  date: z.iso
    .date()
    .transform(toDateString)
    .describe("Transaction date in YYYY-MM-DD format"),
  description: z.string().optional().describe("Short transaction description"),
  type: z
    .enum([
      TransactionType.INCOME,
      TransactionType.EXPENSE,
      TransactionType.REFUND,
    ])
    .describe("Transaction type"),
});

export type CreateTransactionToolInput = z.infer<
  typeof createTransactionInputSchema
>;

interface TransactionData {
  accountId: string;
  amount: number;
  categoryId?: string;
  currency: string;
  date: string;
  description?: string;
  id: string;
  type: TransactionType;
}

export const createCreateTransactionTool = (
  transactionService: TransactionService,
  userId: string,
): ToolSignature<CreateTransactionToolInput> => ({
  name: "createTransaction",
  description: "Create a new transaction.",
  inputSchema: createTransactionInputSchema,
  func: async (input: CreateTransactionToolInput): Promise<string> => {
    const serviceInput: CreateTransactionServiceInput = {
      ...input,
    };
    const created = await transactionService.createTransaction(
      serviceInput,
      userId,
    );

    const transactionData: TransactionData = {
      accountId: created.accountId,
      amount: created.amount,
      categoryId: created.categoryId,
      currency: created.currency,
      date: created.date,
      description: created.description,
      id: created.id,
      type: created.type,
    };

    return JSON.stringify(transactionData);
  },
});
