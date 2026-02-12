import { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "langchain";
import { z } from "zod";
import { AiDataService } from "../services/ai-data-service";

interface ToolContext {
  userId: string;
  aiDataService: AiDataService;
}

interface ToolContextWithDateRange extends ToolContext {
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export function validateBaseToolContext(
  runnableConfig: RunnableConfig<Record<string, unknown>>,
): ToolContext {
  const toolContext = runnableConfig.configurable;

  if (!toolContext) {
    throw new Error("Tool context is required");
  }

  if (!toolContext.userId || typeof toolContext.userId !== "string") {
    throw new Error("Tool context must have a valid userId");
  }

  if (
    !("aiDataService" in toolContext) ||
    !(toolContext.aiDataService instanceof AiDataService)
  ) {
    throw new Error("Tool context must have a valid aiDataService");
  }

  return {
    userId: toolContext.userId,
    aiDataService: toolContext.aiDataService,
  };
}

export function validateToolContextWithDateRange(
  runnableConfig: RunnableConfig<Record<string, unknown>>,
): ToolContextWithDateRange {
  const baseContext = validateBaseToolContext(runnableConfig);
  const toolContext = runnableConfig.configurable;

  if (!toolContext) {
    throw new Error("Tool context is required");
  }

  if (
    typeof toolContext.dateRange !== "object" ||
    toolContext.dateRange === null
  ) {
    throw new Error("Tool context must have a valid dateRange");
  }

  const dateRange = toolContext.dateRange;

  if (
    !(
      "startDate" in dateRange &&
      typeof dateRange.startDate === "string"
    )
  ) {
    throw new Error("Tool context dateRange must have a valid startDate");
  }

  if (
    !(
      "endDate" in dateRange &&
      typeof dateRange.endDate === "string"
    )
  ) {
    throw new Error("Tool context dateRange must have a valid endDate");
  }

  return {
    ...baseContext,
    dateRange: {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    },
  };
}

export const getTransactionsTool = tool(
  async (
    input: { categoryId?: string; accountId?: string },
    runnableConfig: RunnableConfig<Record<string, unknown>>,
  ) => {
    const toolContext = validateToolContextWithDateRange(runnableConfig);

    const transactions =
      await toolContext.aiDataService.getFilteredTransactions(
        toolContext.userId,
        {
          startDate: toolContext.dateRange.startDate,
          endDate: toolContext.dateRange.endDate,
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

export const getAccountsTool = tool(
  async (_input, runnableConfig: RunnableConfig<Record<string, unknown>>) => {
    const toolContext = validateBaseToolContext(runnableConfig);

    const accounts = await toolContext.aiDataService.getAllAccounts(
      toolContext.userId,
    );

    return JSON.stringify(accounts);
  },
  {
    name: "getAccounts",
    description:
      "Retrieve all user accounts. Each account has id, name, currency, and isArchived status.",
    schema: z.object({}),
  },
);

export const getCategoriesTool = tool(
  async (_input, runnableConfig: RunnableConfig<Record<string, unknown>>) => {
    const toolContext = validateBaseToolContext(runnableConfig);

    const categories = await toolContext.aiDataService.getAllCategories(
      toolContext.userId,
    );

    return JSON.stringify(categories);
  },
  {
    name: "getCategories",
    description:
      "Retrieve all user categories. Each category has id, name, type (INCOME or EXPENSE), and isArchived status.",
    schema: z.object({}),
  },
);
