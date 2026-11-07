import { tool } from "langchain";
import { z } from "zod";
import { TransactionType } from "../../models/transaction";
import {
  AGGREGATE_GROUP_BY,
  AggregateTransactionsService,
} from "../../services/aggregate-transactions-service";
import { toDateString } from "../../types/date-string";
import { agentContextSchema } from "../agents/agent-context";
import { MAX_PERIOD_DAYS } from "./get-transactions";

const schema = z.object({
  startDate: z.iso
    .date()
    .describe("Start date for filtering transactions (inclusive)"),
  endDate: z.iso
    .date()
    .describe("End date for filtering transactions (inclusive)"),
  accountIds: z
    .array(z.string())
    .optional()
    .describe("Account IDs to filter transactions by"),
  categoryIds: z
    .array(z.string())
    .optional()
    .describe("Category IDs to filter transactions by"),
  includeUncategorized: z
    .boolean()
    .optional()
    .describe("When true, also include transactions with no category"),
  types: z
    .array(z.enum(TransactionType))
    .optional()
    .describe("Transaction types to filter by"),
  includeTransactionsExcludedFromReports: z
    .boolean()
    .describe(
      "When false, transactions linked to a category flagged excludeFromReports are dropped before aggregating; when true, they are included",
    ),
  groupBy: z
    .enum(AGGREGATE_GROUP_BY)
    .optional()
    .describe(
      "Buckets each type/currency split further along one additional dimension",
    ),
});

const description = `
Compute sum, count, min, and max over transactions that match a filter, without returning the transactions.
Results are split by transaction type and currency; one result never mixes types or currencies.
sum, min, and max use unsigned amounts.
groupBy splits each result further by account, category, or month.
The date range must not exceed ${MAX_PERIOD_DAYS} days.
`.trim();

export const createAggregateTransactionsTool = ({
  aggregateTransactionsService,
}: {
  aggregateTransactionsService: AggregateTransactionsService;
}) =>
  tool(
    async (
      {
        startDate,
        endDate,
        accountIds,
        categoryIds,
        includeUncategorized,
        types,
        includeTransactionsExcludedFromReports,
        groupBy,
      },
      config,
    ) => {
      const userId = agentContextSchema.shape.userId.parse(
        config?.context?.userId,
      );

      return aggregateTransactionsService.call({
        userId,
        startDate: toDateString(startDate),
        endDate: toDateString(endDate),
        ...(accountIds && { accountIds }),
        ...(categoryIds && { categoryIds }),
        ...(includeUncategorized && { includeUncategorized }),
        ...(types && { types }),
        includeTransactionsExcludedFromReports,
        ...(groupBy && { groupBy }),
      });
    },
    {
      name: "aggregate_transactions",
      description,
      schema,
    },
  );
