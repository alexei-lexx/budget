import { z } from "zod";
import { TransactionType } from "../../models/transaction";
import { toDateString } from "../../types/date";
import { Failure, Success } from "../../types/result";
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

export const createCreateTransactionTool = (params: {
  maxCreations: number;
  transactionService: TransactionService;
  userId: string;
}): ToolSignature<CreateTransactionToolInput, TransactionData> => {
  let successfulCreations = 0;

  return {
    name: "createTransaction",
    description: "Create a new transaction.",
    inputSchema: createTransactionInputSchema,
    call: async (input: CreateTransactionToolInput) => {
      if (successfulCreations >= params.maxCreations) {
        return Failure(
          `Error: transaction creation limit reached (${params.maxCreations} transactions)`,
        );
      }

      const serviceInput: CreateTransactionServiceInput = {
        ...input,
      };
      const created = await params.transactionService.createTransaction(
        serviceInput,
        params.userId,
      );

      successfulCreations++;

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

      return Success(transactionData);
    },
  };
};
