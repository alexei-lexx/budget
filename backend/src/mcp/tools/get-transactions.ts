import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  TransactionDto,
  toTransactionDto,
} from "../../langchain/tools/transaction-dto";
import { TransactionType } from "../../models/transaction";
import { TransactionRepository } from "../../ports/transaction-repository";
import { DateString, toDateString } from "../../types/date";
import { Failure, Result, Success } from "../../types/result";
import { daysBetween } from "../../utils/date";
import { toToolResult } from "./to-tool-result";

export const MAX_PERIOD_DAYS = 365;

export async function getTransactions(
  {
    startDate,
    endDate,
    accountIds,
    categoryIds,
    types,
  }: {
    startDate: DateString;
    endDate: DateString;
    accountIds?: string[];
    categoryIds?: string[];
    types?: TransactionType[];
  },
  {
    transactionRepository,
    userId,
  }: {
    transactionRepository: TransactionRepository;
    userId: string;
  },
): Promise<Result<TransactionDto[]>> {
  if (startDate > endDate) {
    return Failure("startDate must not be after endDate");
  }

  if (daysBetween(new Date(startDate), new Date(endDate)) > MAX_PERIOD_DAYS) {
    return Failure(`Date range must not exceed ${MAX_PERIOD_DAYS} days`);
  }

  const transactions = await transactionRepository.findManyByUserId(userId, {
    dateAfter: startDate,
    dateBefore: endDate,
    ...(accountIds && { accountIds }),
    ...(categoryIds && { categoryIds }),
    ...(types !== undefined && { types }),
  });

  return Success(transactions.map(toTransactionDto));
}

const typesString = Object.values(TransactionType).join(", ");

const inputSchema = {
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
    .describe(`Transaction types to filter by (${typesString})`),
};

const description = `
Get user transactions filtered by date range and optionally
by one or more accountIds,
one or more categoryIds,
or one or more transaction types.
The given date range must not exceed ${MAX_PERIOD_DAYS} days.

Transaction is a record of a money movement.

- The user can spend, receive, refund, or transfer money
- Each transaction MUST have a type (${typesString})
  - EXPENSE increases spending
  - REFUND decreases spending in the same category
  - INCOME and all TRANSFER types never affect spending
- Each transaction MUST belong to exactly one account
- Each transaction MUST have an amount, a currency, and a date

A transaction can optionally:
  - belong to a category
  - have a description
`.trim();

export function registerGetTransactionsTool(
  server: McpServer,
  deps: { transactionRepository: TransactionRepository; userId: string },
): void {
  server.registerTool(
    "get_transactions",
    {
      description,
      inputSchema,
    },
    async ({ startDate, endDate, accountIds, categoryIds, types }) =>
      toToolResult(
        await getTransactions(
          {
            startDate: toDateString(startDate),
            endDate: toDateString(endDate),
            accountIds,
            categoryIds,
            types,
          },
          deps,
        ),
      ),
  );
}
