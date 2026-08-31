import { z } from "zod";
import { TransactionType } from "../../models/transaction";
import {
  AGGREGATE_GROUP_BY,
  AggregateGroupBy,
  AggregateTransactionsService,
} from "../../services/aggregate-transactions-service";
import { DateString, toDateString } from "../../types/date-string";
import { buildGuideTokensField, verifyGuideTokens } from "./guides";
import { Tool } from "./tool";

const requiredGuides = ["basics"] as const;

export async function aggregateTransactions(
  {
    startDate,
    endDate,
    accountIds,
    categoryIds,
    includeUncategorized,
    types,
    includeTransactionsExcludedFromReports,
    groupBy,
    guideTokens,
  }: {
    startDate: DateString;
    endDate: DateString;
    accountIds?: string[];
    categoryIds?: string[];
    includeUncategorized?: boolean;
    types?: TransactionType[];
    includeTransactionsExcludedFromReports: boolean;
    groupBy?: AggregateGroupBy;
    guideTokens: string[];
  },
  {
    aggregateTransactionsService,
    userId,
  }: {
    aggregateTransactionsService: AggregateTransactionsService;
    userId: string;
  },
) {
  const verification = verifyGuideTokens({
    guideTokens,
    requiredGuides,
  });
  if (!verification.success) return verification;

  return aggregateTransactionsService.call({
    userId,
    startDate,
    endDate,
    ...(accountIds && { accountIds }),
    ...(categoryIds && { categoryIds }),
    ...(includeUncategorized && { includeUncategorized }),
    ...(types !== undefined && { types }),
    includeTransactionsExcludedFromReports,
    ...(groupBy && { groupBy }),
  });
}

const inputSchema = z.object({
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
  guideTokens: buildGuideTokensField(requiredGuides),
});

const description = `
Compute sum, count, min, and max over transactions matching a filter,
without returning the transactions themselves.
`.trim();

export function createAggregateTransactionsTool(deps: {
  aggregateTransactionsService: AggregateTransactionsService;
  userId: string;
}): Tool<{
  startDate: string;
  endDate: string;
  accountIds?: string[];
  categoryIds?: string[];
  includeUncategorized?: boolean;
  types?: TransactionType[];
  includeTransactionsExcludedFromReports: boolean;
  groupBy?: AggregateGroupBy;
  guideTokens: string[];
}> {
  return {
    name: "aggregate_transactions",
    description,
    inputSchema,
    run: ({
      startDate,
      endDate,
      accountIds,
      categoryIds,
      includeUncategorized,
      types,
      includeTransactionsExcludedFromReports,
      groupBy,
      guideTokens,
    }) =>
      aggregateTransactions(
        {
          startDate: toDateString(startDate),
          endDate: toDateString(endDate),
          accountIds,
          categoryIds,
          includeUncategorized,
          types,
          includeTransactionsExcludedFromReports,
          groupBy,
          guideTokens,
        },
        deps,
      ),
  };
}
