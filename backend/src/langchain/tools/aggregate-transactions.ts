import { tool } from "langchain";
import { z } from "zod";
import { TransactionType, getSignedAmount } from "../../models/transaction";
import { TransactionRepository } from "../../ports/transaction-repository";
import { toDateString } from "../../types/date";
import { Failure, Success } from "../../types/result";
import { daysBetween } from "../../utils/date";
import { MAX_PERIOD_DAYS } from "./get-transactions";

const schema = z.object({
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

type Currency = string;

export const createAggregateTransactionsTool = ({
  transactionRepository,
}: {
  transactionRepository: TransactionRepository;
}) =>
  tool(
    async ({ startDate, endDate, accountIds, categoryIds, types }, config) => {
      const userId = config.context.userId;
      if (!userId || typeof userId !== "string") {
        throw new Error("Invalid tool context: missing userId");
      }

      if (startDate > endDate) {
        return Failure("startDate must not be after endDate");
      }

      if (
        daysBetween(new Date(startDate), new Date(endDate)) > MAX_PERIOD_DAYS
      ) {
        return Failure(`Date range must not exceed ${MAX_PERIOD_DAYS} days`);
      }

      const transactions = await transactionRepository.findManyByUserId(
        userId,
        {
          dateAfter: toDateString(startDate),
          dateBefore: toDateString(endDate),
          ...(accountIds && { accountIds }),
          ...(categoryIds && { categoryIds }),
          ...(types !== undefined && { types }),
        },
      );

      const sumByCurrency: Record<Currency, number> = {};
      const countByCurrency: Record<Currency, number> = {};

      for (const transaction of transactions) {
        const { currency } = transaction;
        const signedAmount = getSignedAmount(transaction);

        sumByCurrency[currency] = (sumByCurrency[currency] ?? 0) + signedAmount;
        countByCurrency[currency] = (countByCurrency[currency] ?? 0) + 1;
      }

      return Success({
        sum: sumByCurrency,
        count: countByCurrency,
      });
    },
    {
      name: "aggregate_transactions",
      description:
        `Aggregate and return sum and count for a filtered set of transactions.` +
        ` Sum uses signed cashflow convention: ${TransactionType.EXPENSE} and ${TransactionType.TRANSFER_OUT} are negative;` +
        ` ${TransactionType.INCOME}, ${TransactionType.REFUND}, and ${TransactionType.TRANSFER_IN} are positive.` +
        ` Filter transactions by date range and optionally by one or more accountIds, one or more categoryIds, or one or more transaction types.` +
        ` Date format: YYYY-MM-DD. The date range must not exceed ${MAX_PERIOD_DAYS} days.`,
      schema,
    },
  );
