import { z } from "zod";
import { TransactionType } from "../../models/transaction";
import { toDateString } from "../../types/date";
import { Failure, Success } from "../../types/result";
import { daysBetween } from "../../utils/date";
import { ToolSignature } from "../ports/agent";
import { TransactionRepository } from "../ports/transaction-repository";
import { MAX_PERIOD_DAYS } from "./get-transactions-tool";

const aggregateTransactionsInputSchema = z.object({
  startDate: z.iso
    .date()
    .describe(
      "Start date for filtering transactions (inclusive). Date format: YYYY-MM-DD",
    ),
  endDate: z.iso
    .date()
    .describe(
      "End date for filtering transactions (inclusive). Date format: YYYY-MM-DD",
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
    .describe(
      `Transaction types to filter by (${Object.values(TransactionType).join(", ")})`,
    ),
});

type AggregateTransactionsInput = z.infer<
  typeof aggregateTransactionsInputSchema
>;

type Currency = string;

interface AggregationOutput {
  sum: Record<Currency, number>;
  count: Record<Currency, number>;
}

export const createAggregateTransactionsTool = (params: {
  transactionRepository: TransactionRepository;
  userId: string;
}): ToolSignature<AggregateTransactionsInput, AggregationOutput> => ({
  name: "aggregateTransactions",
  description:
    `Aggregate and return sum and count for a filtered set of transactions.` +
    ` Sum uses signed cashflow convention: ${TransactionType.EXPENSE} and ${TransactionType.TRANSFER_OUT} are negative;` +
    ` ${TransactionType.INCOME}, ${TransactionType.REFUND}, and ${TransactionType.TRANSFER_IN} are positive.` +
    ` Filter transactions by date range and optionally by one or more accountIds, one or more categoryIds, or one or more transaction types.` +
    ` Date format: YYYY-MM-DD. The date range must not exceed ${MAX_PERIOD_DAYS} days.`,
  inputSchema: aggregateTransactionsInputSchema,
  call: async (input: AggregateTransactionsInput) => {
    if (input.startDate > input.endDate) {
      return Failure("startDate must not be after endDate");
    }

    if (
      daysBetween(new Date(input.startDate), new Date(input.endDate)) >
      MAX_PERIOD_DAYS
    ) {
      return Failure(`Date range must not exceed ${MAX_PERIOD_DAYS} days`);
    }

    const transactions = await params.transactionRepository.findManyByUserId(
      params.userId,
      {
        dateAfter: toDateString(input.startDate),
        dateBefore: toDateString(input.endDate),
        ...(input.accountIds && { accountIds: input.accountIds }),
        ...(input.categoryIds && { categoryIds: input.categoryIds }),
        ...(input.types !== undefined && { types: input.types }),
      },
    );

    const sumByCurrency: Record<Currency, number> = {};
    const countByCurrency: Record<Currency, number> = {};

    for (const transaction of transactions) {
      const { currency, signedAmount } = transaction;

      sumByCurrency[currency] = (sumByCurrency[currency] ?? 0) + signedAmount;
      countByCurrency[currency] = (countByCurrency[currency] ?? 0) + 1;
    }

    return Success({
      sum: sumByCurrency,
      count: countByCurrency,
    });
  },
});
