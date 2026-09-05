import { tool } from "langchain";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { TransactionType } from "../../models/transaction";
import { TransactionRepository } from "../../ports/transaction-repository";
import { toDateString } from "../../types/date-string";
import { Failure, Success } from "../../types/result";
import { agentContextSchema } from "../agents/agent-context";
import { toTransactionDto } from "./transaction-dto";

export const DEFAULT_MAX_PERIOD_DAYS = 365;
export const GET_TRANSACTIONS_TOOL_NAME = "get_transactions";

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

const buildDescription = (maxPeriodDays: number) =>
  `Get filtered transactions by date range
and optionally by one or more accountIds,
one or more categoryIds,
or one or more transaction types.
Date format: YYYY-MM-DD.
The date range must not exceed ${maxPeriodDays} days.
For longer periods, call this tool multiple times with sequential ranges.
`.trim();

export const createGetTransactionsTool = ({
  transactionRepository,
  maxPeriodDays = DEFAULT_MAX_PERIOD_DAYS,
}: {
  transactionRepository: TransactionRepository;
  maxPeriodDays?: number;
}) =>
  tool(
    async ({ startDate, endDate, accountIds, categoryIds, types }, config) => {
      const userId = agentContextSchema.shape.userId.parse(
        config?.context?.userId,
      );
      if (startDate > endDate) {
        return Failure("startDate must not be after endDate");
      }

      const startPlainDate = Temporal.PlainDate.from(startDate);
      const endPlainDate = Temporal.PlainDate.from(endDate);
      const daysBetween = startPlainDate.until(endPlainDate).days;

      if (daysBetween > maxPeriodDays) {
        return Failure(`Date range must not exceed ${maxPeriodDays} days`);
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

      return Success(transactions.map(toTransactionDto));
    },
    {
      name: GET_TRANSACTIONS_TOOL_NAME,
      description: buildDescription(maxPeriodDays),
      schema,
    },
  );
