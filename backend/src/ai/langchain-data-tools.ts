import { ToolRuntime, tool } from "langchain";
import { z } from "zod";
import { AiDataService } from "../services/ai-data-service";

interface ToolContext {
  userId: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  aiDataService: AiDataService;
}

function isToolContext(value: unknown): value is ToolContext {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.userId !== "string") {
    return false;
  }

  if (typeof candidate.dateRange !== "object" || candidate.dateRange === null) {
    return false;
  }

  const dateRange = candidate.dateRange as Record<string, unknown>;

  if (
    typeof dateRange.startDate !== "string" ||
    typeof dateRange.endDate !== "string"
  ) {
    return false;
  }

  if (
    !(candidate.aiDataService instanceof AiDataService) &&
    typeof (candidate.aiDataService as { getFilteredTransactions?: unknown })
      .getFilteredTransactions !== "function"
  ) {
    return false;
  }

  return true;
}

export const getTransactionsTool = tool(
  async (
    input: { categoryId?: string; accountId?: string },
    runtime: ToolRuntime,
  ) => {
    if (!runtime.config) {
      throw new Error("Runtime config is required for getTransactionsTool");
    }

    const context = runtime.config.configurable;

    if (!isToolContext(context)) {
      throw new Error("Tool context is required for getTransactionsTool");
    }

    const transactions = await context.aiDataService.getFilteredTransactions(
      context.userId,
      {
        startDate: context.dateRange.startDate,
        endDate: context.dateRange.endDate,
      },
      input.accountId,
      input.categoryId,
    );

    return JSON.stringify(transactions);
  },
  {
    name: "getTransactions",
    description:
      "Retrieve transactions filtered by category ID and/or account ID. If both categoryId and accountId are omitted, returns all transactions.",
    schema: z.object({
      accountId: z
        .string()
        .optional()
        .describe(
          "Optional account ID to filter transactions. If provided, only transactions from this account will be returned.",
        ),
      categoryId: z
        .string()
        .optional()
        .describe(
          "Optional category ID to filter transactions. If provided, only transactions with this category will be returned.",
        ),
    }),
  },
);
