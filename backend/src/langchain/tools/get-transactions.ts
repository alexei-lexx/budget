import { tool } from "langchain";
import { z } from "zod";
import { TransactionType } from "../../models/transaction";
import { TransactionRepository } from "../../ports/transaction-repository";
import { toDateString } from "../../types/date";
import { Failure, Success } from "../../types/result";
import { daysBetween } from "../../utils/date";

export const MAX_PERIOD_DAYS = 365;

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

export const createGetTransactionsTool = ({
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

      const transactionData = transactions.map((transaction) => ({
        id: transaction.id,
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        date: transaction.date,
        description: transaction.description,
        transferId: transaction.transferId,
      }));

      return Success(transactionData);
    },
    {
      name: "get_transactions",
      description: `Get filtered transactions by date range and optionally by one or more accountIds, one or more categoryIds, or one or more transaction types. Date format: YYYY-MM-DD. The date range must not exceed ${MAX_PERIOD_DAYS} days.`,
      schema,
    },
  );
