import { tool } from "langchain";
import { z } from "zod";
import { TransactionType } from "../../models/transaction";
import {
  CreateTransactionServiceInput,
  TransactionService,
} from "../../services/transaction-service";
import { toDateString } from "../../types/date";
import { Success } from "../../types/result";
import { agentContextSchema } from "../agents/agent-context";

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

export const CREATE_TRANSACTION_TOOL_NAME = "create_transaction";

export const createCreateTransactionTool = ({
  transactionService,
}: {
  transactionService: TransactionService;
}) => {
  return tool(
    async (input: CreateTransactionInput, config) => {
      const userId = agentContextSchema.shape.userId.parse(
        config?.context?.userId,
      );

      const serviceInput: CreateTransactionServiceInput = { ...input };
      const created = await transactionService.createTransaction(
        serviceInput,
        userId,
      );

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
