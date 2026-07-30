import { tool } from "langchain";
import { z } from "zod";
import { TransactionRepository } from "../../ports/transaction-repository";
import {
  MAX_PERIOD_DAYS,
  description,
  getTransactions,
  inputSchema,
} from "../../tools/get-transactions";
import { toDateString } from "../../types/date";
import { agentContextSchema } from "../agents/agent-context";

export { MAX_PERIOD_DAYS };

const schema = z.object(inputSchema);

export const createGetTransactionsTool = ({
  transactionRepository,
}: {
  transactionRepository: TransactionRepository;
}) =>
  tool(
    async (
      {
        startDate,
        endDate,
        accountIds,
        categoryIds,
        types,
      }: z.infer<typeof schema>,
      config,
    ) => {
      const userId = agentContextSchema.shape.userId.parse(
        config?.context?.userId,
      );

      return getTransactions(
        {
          startDate: toDateString(startDate),
          endDate: toDateString(endDate),
          accountIds,
          categoryIds,
          types,
        },
        { transactionRepository, userId },
      );
    },
    {
      name: "get_transactions",
      description,
      schema,
    },
  );
