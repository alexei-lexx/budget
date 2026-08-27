import { McpServer } from "@modelcontextprotocol/server";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import {
  TransactionDto,
  toTransactionDto,
} from "../../langchain/tools/transaction-dto";
import { TransactionType } from "../../models/transaction";
import { TransactionRepository } from "../../ports/transaction-repository";
import { DateString, toDateString } from "../../types/date-string";
import { Failure, Result, Success } from "../../types/result";
import { buildGuideTokensField, verifyGuideTokens } from "./guides";
import { toToolResult } from "./to-tool-result";

export const MAX_PERIOD_DAYS = 365;

const requiredGuides = ["basics"] as const;

export async function getTransactions(
  {
    startDate,
    endDate,
    accountIds,
    categoryIds,
    types,
    guideTokens,
  }: {
    startDate: DateString;
    endDate: DateString;
    accountIds?: string[];
    categoryIds?: string[];
    types?: TransactionType[];
    guideTokens: string[];
  },
  {
    transactionRepository,
    userId,
  }: {
    transactionRepository: TransactionRepository;
    userId: string;
  },
): Promise<Result<TransactionDto[]>> {
  const verification = verifyGuideTokens({
    guideTokens,
    requiredGuides,
  });
  if (!verification.success) return verification;

  if (startDate > endDate) {
    return Failure("startDate must not be after endDate");
  }

  const startPlainDate = Temporal.PlainDate.from(startDate);
  const endPlainDate = Temporal.PlainDate.from(endDate);
  const daysBetween = startPlainDate.until(endPlainDate, {
    largestUnit: "day",
  }).days;

  if (daysBetween > MAX_PERIOD_DAYS) {
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

const inputSchema = z.object({
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
  guideTokens: buildGuideTokensField(requiredGuides),
});

const description = `
Get user transactions filtered by date range and optionally
by one or more accountIds,
one or more categoryIds,
or one or more transaction types.
The given date range must not exceed ${MAX_PERIOD_DAYS} days.
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
    async ({
      startDate,
      endDate,
      accountIds,
      categoryIds,
      types,
      guideTokens,
    }) =>
      toToolResult(
        await getTransactions(
          {
            startDate: toDateString(startDate),
            endDate: toDateString(endDate),
            accountIds,
            categoryIds,
            types,
            guideTokens,
          },
          deps,
        ),
      ),
  );
}
