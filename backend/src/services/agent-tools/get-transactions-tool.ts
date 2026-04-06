import { z } from "zod";
import { TransactionType } from "../../models/transaction";
import { toDateString } from "../../types/date";
import { Failure, Success } from "../../types/result";
import { daysBetween } from "../../utils/date";
import { ToolSignature } from "../ports/agent";
import { TransactionRepository } from "../ports/transaction-repository";

const getTransactionsInputSchema = z.object({
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

type GetTransactionsInput = z.infer<typeof getTransactionsInputSchema>;

interface TransactionData {
  id: string;
  accountId: string;
  categoryId?: string;
  type: string;
  amount: number;
  currency: string;
  date: string;
  description?: string;
  transferId?: string;
}

export const MAX_PERIOD_DAYS = 365;

export const createGetTransactionsTool = (params: {
  transactionRepository: TransactionRepository;
  userId: string;
}): ToolSignature<GetTransactionsInput, TransactionData[]> => ({
  name: "getTransactions",
  description: `Get filtered transactions by date range and optionally by one or more accountIds, one or more categoryIds, or one or more transaction types. Date format: YYYY-MM-DD. The date range must not exceed ${MAX_PERIOD_DAYS} days.`,
  inputSchema: getTransactionsInputSchema,
  func: async (input: GetTransactionsInput) => {
    // Validate that startDate is not after endDate
    if (input.startDate > input.endDate) {
      return Failure("startDate must not be after endDate");
    }

    // Validate that date range does not exceed MAX_PERIOD_DAYS
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

    const transactionData: TransactionData[] = transactions.map(
      (transaction) => ({
        id: transaction.id,
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        date: transaction.date,
        description: transaction.description,
        transferId: transaction.transferId,
      }),
    );

    return Success(transactionData);
  },
});
