import { tool } from "langchain";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { TransactionType } from "../../models/transaction";
import { TransactionRepository } from "../../ports/transaction-repository";
import { BusinessError } from "../../services/business-error";
import { toDateString } from "../../types/date-string";
import { agentContextSchema } from "../agents/agent-context";
import { toTransactionDto } from "./transaction-dto";

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
      const userId = agentContextSchema.shape.userId.parse(
        config?.context?.userId,
      );
      if (startDate > endDate) {
        throw new BusinessError("startDate must not be after endDate");
      }

      const startPlainDate = Temporal.PlainDate.from(startDate);
      const endPlainDate = Temporal.PlainDate.from(endDate);
      const daysBetween = startPlainDate.until(endPlainDate).days;

      if (daysBetween > MAX_PERIOD_DAYS) {
        throw new BusinessError(
          `Date range must not exceed ${MAX_PERIOD_DAYS} days`,
        );
      }

      const transactions = await transactionRepository.findManyByUserId(
        userId,
        {
          dateAfter: toDateString(startDate),
          dateBefore: toDateString(endDate),
          ...(accountIds && { accountIds }),
          ...(categoryIds && { categoryIds }),
          ...(types && { types }),
        },
      );

      return transactions.map(toTransactionDto);
    },
    {
      name: "get_transactions",
      description: `Get filtered transactions by date range and optionally by one or more accountIds, one or more categoryIds, or one or more transaction types. Date format: YYYY-MM-DD. The date range must not exceed ${MAX_PERIOD_DAYS} days.`,
      schema,
    },
  );
