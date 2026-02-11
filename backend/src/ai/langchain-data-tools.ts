import { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "langchain";
import { z } from "zod";
import { AiDataService } from "../services/ai-data-service";
import { DateRange } from "../types/date-range";

interface ToolContext {
  userId: string;
  dateRange: DateRange;
  aiDataService: AiDataService;
}

export const getTransactionsTool = tool(
  async (
    input: { categoryIds?: string[]; accountIds?: string[] },
    runnableConfig: RunnableConfig,
  ) => {
    const toolContext = runnableConfig.configurable as ToolContext;
    const transactions =
      await toolContext.aiDataService.getFilteredTransactions(
        toolContext.userId,
        toolContext.dateRange,
        input.categoryIds,
        input.accountIds,
      );

    return JSON.stringify(transactions);
  },
  {
    name: "getTransactions",
    description:
      "Retrieve transactions filtered by category IDs and/or account IDs. If both categoryIds and accountIds are omitted, returns all transactions.",
    schema: z.object({
      categoryIds: z
        .array(z.string())
        .optional()
        .describe(
          "Optional array of category IDs to filter transactions. If provided, only transactions with these category IDs will be returned.",
        ),
      accountIds: z
        .array(z.string())
        .optional()
        .describe(
          "Optional array of account IDs to filter transactions. If provided, only transactions from these accounts will be returned.",
        ),
    }),
  },
);
