import { z } from "zod";
import { toDateString } from "../../types/date";
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
  categoryId: z
    .string()
    .optional()
    .describe("Category ID to filter transactions by"),
  accountId: z
    .string()
    .optional()
    .describe("Account ID to filter transactions by"),
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
}): ToolSignature<GetTransactionsInput> => ({
  name: "getTransactions",
  description: `Get filtered transactions by date range and optionally by single categoryId or accountId. Only returns active (non-archived) transactions. Date format: YYYY-MM-DD. The date range must not exceed 365 days.`,
  inputSchema: getTransactionsInputSchema,
  func: async (input: GetTransactionsInput) => {
    // Validate that startDate is not after endDate
    if (input.startDate > input.endDate) {
      return JSON.stringify({ error: "startDate must not be after endDate" });
    }

    // Validate that date range does not exceed MAX_PERIOD_DAYS
    if (
      daysBetween(new Date(input.startDate), new Date(input.endDate)) >
      MAX_PERIOD_DAYS
    ) {
      return JSON.stringify({
        error: `Date range must not exceed ${MAX_PERIOD_DAYS} days`,
      });
    }

    const transactions = await params.transactionRepository.findActiveByUserId(
      params.userId,
      {
        dateAfter: toDateString(input.startDate),
        dateBefore: toDateString(input.endDate),
        ...(input.categoryId && { categoryIds: [input.categoryId] }),
        ...(input.accountId && { accountIds: [input.accountId] }),
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

    return JSON.stringify(transactionData);
  },
});
