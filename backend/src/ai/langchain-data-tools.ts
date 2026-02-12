import { ToolRuntime, tool } from "langchain";
import { z } from "zod";
import { AiDataService } from "../services/ai-data-service";

// Zod schema for validatable context properties
export const toolContextSchema = z.object({
  userId: z.string(),
  dateRange: z.object({
    startDate: z.string(),
    endDate: z.string(),
  }),
  // Note: aiDataService is a class instance and must be passed via configurable
  // as Zod cannot validate class instances
});

// Type for validated context
export type ToolContext = z.infer<typeof toolContextSchema>;

// Extended context type including the service instance
export interface ToolContextWithService extends ToolContext {
  aiDataService: AiDataService;
}

export const getTransactionsTool = tool(
  async (
    input: { categoryId?: string; accountId?: string },
    runtime: ToolRuntime<unknown, ToolContext>,
  ) => {
    // Access validated context from runtime.context (validated by contextSchema in agent)
    const context = runtime.context;

    if (!context) {
      throw new Error("Tool context is required for getTransactionsTool");
    }

    // Get aiDataService from configurable since it can't be validated by Zod
    const aiDataService = runtime.config?.configurable?.aiDataService;

    if (
      !aiDataService ||
      (!(aiDataService instanceof AiDataService) &&
        typeof (aiDataService as { getFilteredTransactions?: unknown })
          .getFilteredTransactions !== "function")
    ) {
      throw new Error(
        "aiDataService is required in configurable context for getTransactionsTool",
      );
    }

    const transactions = await (
      aiDataService as AiDataService
    ).getFilteredTransactions(
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
