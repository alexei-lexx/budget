import { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "langchain";
import { z } from "zod";
import { AiDataService } from "../services/ai-data-service";

export const getTransactionsTool = tool(
  async (
    input: { categoryIds?: string[]; accountIds?: string[] },
    runnableConfig: RunnableConfig<Record<string, unknown>>,
  ) => {
    const toolContext = runnableConfig.configurable;

    if (!toolContext) {
      throw new Error("Tool context is required for getTransactionsTool");
    }

    if (!toolContext.userId || typeof toolContext.userId !== "string") {
      throw new Error("Tool context must have a valid userId");
    }

    if (
      typeof toolContext.dateRange !== "object" ||
      toolContext.dateRange === null
    ) {
      throw new Error("Tool context must have a valid dateRange");
    }

    if (
      !(
        "startDate" in toolContext.dateRange &&
        typeof toolContext.dateRange.startDate === "string"
      )
    ) {
      throw new Error("Tool context dateRange must have a valid startDate");
    }

    if (
      !(
        "endDate" in toolContext.dateRange &&
        typeof toolContext.dateRange.endDate === "string"
      )
    ) {
      throw new Error("Tool context dateRange must have a valid endDate");
    }

    if (
      !("aiDataService" in toolContext) ||
      !(toolContext.aiDataService instanceof AiDataService)
    ) {
      throw new Error("Tool context must have a valid aiDataService");
    }

    const transactions =
      await toolContext.aiDataService.getFilteredTransactions(
        toolContext.userId,
        {
          startDate: toolContext.dateRange.startDate,
          endDate: toolContext.dateRange.endDate,
        },
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
