import { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "langchain";
import { z } from "zod";
import { AiDataService } from "../services/ai-data-service";

export const getTransactionsTool = tool(
  async (
    input: { categoryId?: string; accountId?: string },
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
  async (
    _input: object,
    runnableConfig: RunnableConfig<Record<string, unknown>>,
  ) => {
    const toolContext = runnableConfig.configurable;

    if (!toolContext) {
      throw new Error("Tool context is required for getAccountsTool");
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

    const accounts = await toolContext.aiDataService.getAllAccounts(
      toolContext.userId,
    );

    return JSON.stringify(accounts);
  },
  {
    name: "getAccounts",
    description:
      "Retrieve all user accounts. Each account has id, name, currency, and isArchived status. Active accounts (isArchived=false) have precedence over archived accounts when names match.",
    schema: z.object({}),
  },
);

export const getCategoriesTool = tool(
  async (
    _input: object,
    runnableConfig: RunnableConfig<Record<string, unknown>>,
  ) => {
    const toolContext = runnableConfig.configurable;

    if (!toolContext) {
      throw new Error("Tool context is required for getCategoriesTool");
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

    const categories = await toolContext.aiDataService.getAllCategories(
      toolContext.userId,
    );

    return JSON.stringify(categories);
  },
  {
    name: "getCategories",
    description:
      "Retrieve all user categories. Each category has id, name, type (INCOME or EXPENSE), and isArchived status. Active categories (isArchived=false) have precedence over archived categories when names match.",
    schema: z.object({}),
  },
);
