import { tool } from "langchain";
import { z } from "zod";
import { TransactionType } from "../../models/transaction";
import { TransactionService } from "../../services/transaction-service";
import { Success } from "../../types/result";
import { agentContextSchema } from "../agents/agent-context";
import { toTransactionDto } from "./transaction-dto";

const schema = z.object({
  expectedCount: z
    .number()
    .int()
    .positive()
    .describe(
      "Soft target number of recent transactions to return. The result may contain fewer or more matches.",
    ),
  accountIds: z
    .array(z.string())
    .optional()
    .describe("Account IDs to filter transactions by (one or more)"),
  categoryIds: z
    .array(z.string())
    .optional()
    .describe("Category IDs to filter transactions by (one or more)"),
  types: z
    .array(z.enum(TransactionType))
    .optional()
    .describe("Transaction types to filter by"),
});

export const createGetRecentTransactionsTool = ({
  transactionService,
}: {
  transactionService: TransactionService;
}) =>
  tool(
    async ({ expectedCount, accountIds, categoryIds, types }, config) => {
      const userId = agentContextSchema.shape.userId.parse(
        config?.context?.userId,
      );

      const transactions = await transactionService.getRecentTransactions({
        userId,
        expectedCount,
        ...(accountIds && { accountIds }),
        ...(categoryIds && { categoryIds }),
        ...(types && { types }),
      });

      return Success(transactions.map(toTransactionDto));
    },
    {
      name: "get_recent_transactions",
      description:
        "Get the most recent transactions (newest first), without specifying a date range, optionally filtered by one or more accountIds, one or more categoryIds, or one or more transaction types. Looks back at most 365 days.",
      schema,
    },
  );
