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
  return (
    typeof value === "object" &&
    value !== null &&
    "userId" in value &&
    typeof value.userId === "string" &&
    "dateRange" in value &&
    typeof value.dateRange === "object" &&
    value.dateRange !== null &&
    "startDate" in value.dateRange &&
    typeof value.dateRange.startDate === "string" &&
    "endDate" in value.dateRange &&
    typeof value.dateRange.endDate === "string" &&
    "aiDataService" in value &&
    value.aiDataService instanceof AiDataService
  );
}

export const getTransactionsTool = tool(
  async (
    input: { categoryId?: string; accountId?: string },
    runtime: ToolRuntime,
  ) => {
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
