import { tool } from "langchain";
import { z } from "zod";
import { TransactionType } from "../../models/transaction";
import {
  CreateTransactionServiceInput,
  TransactionService,
} from "../../services/transaction-service";
import { toDateString } from "../../types/date";
import { Failure, Success } from "../../types/result";
import { agentContextSchema } from "./agent-context";

const schema = z.object({
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

export type CreateTransactionInput = z.infer<typeof schema>;

export const CREATE_TRANSACTION_TOOL_NAME = "createTransaction";

export const createCreateTransactionTool = ({
  maxCreations,
  transactionService,
}: {
  maxCreations: number;
  transactionService: TransactionService;
}) => {
  let successfulCreations = 0;

  return tool(
    async (input: CreateTransactionInput, config) => {
      const { userId } = agentContextSchema.parse(config?.context);
      if (successfulCreations >= maxCreations) {
        return Failure(
          `Error: transaction creation limit reached (${maxCreations} transactions)`,
        );
      }

      const serviceInput: CreateTransactionServiceInput = { ...input };
      const created = await transactionService.createTransaction(
        serviceInput,
        userId,
      );

      successfulCreations++;

      return Success({
        id: created.id,
        accountId: created.accountId,
        amount: created.amount,
        categoryId: created.categoryId,
        currency: created.currency,
        date: created.date,
        description: created.description,
        type: created.type,
      });
    },
    {
      name: CREATE_TRANSACTION_TOOL_NAME,
      description: "Create a new transaction.",
      schema,
    },
  );
};
