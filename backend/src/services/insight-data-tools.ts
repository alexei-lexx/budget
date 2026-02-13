import { z } from "zod";
import { ToolSignature } from "../models/ai-agent";
import { AiDataService } from "./ai-data-service";

export const createGetAccountsTool = (
  aiDataService: AiDataService,
  userId: string,
): ToolSignature<object> => ({
  name: "getAccounts",
  description: "Get all user accounts (both active and archived).",
  inputSchema: z.object(),
  func: async () => {
    const accounts = await aiDataService.getAllAccounts(userId);
    return JSON.stringify(accounts, null, 2);
  },
});

export const createGetCategoriesTool = (
  aiDataService: AiDataService,
  userId: string,
): ToolSignature<object> => ({
  name: "getCategories",
  description: "Get all user categories (both active and archived).",
  inputSchema: z.object(),
  func: async () => {
    const categories = await aiDataService.getAllCategories(userId);
    return JSON.stringify(categories);
  },
});

const getTransactionsInputSchema = z.object({
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
});

type GetTransactionsInput = z.infer<typeof getTransactionsInputSchema>;

export const createGetTransactionsTool = (
  aiDataService: AiDataService,
  userId: string,
): ToolSignature<GetTransactionsInput> => ({
  name: "getTransactions",
  description:
    "Get filtered transactions by date range and optionally by single categoryId or accountId. Only returns active (non-archived) transactions. Date format: YYYY-MM-DD.",
  inputSchema: getTransactionsInputSchema,
  func: async (input: GetTransactionsInput) => {
    const transactions = await aiDataService.getFilteredTransactions(
      userId,
      { startDate: input.startDate, endDate: input.endDate },
      input.categoryId,
      input.accountId,
    );
    return JSON.stringify(transactions, null, 2);
  },
});
