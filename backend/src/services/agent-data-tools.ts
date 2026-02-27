import { z } from "zod";
import { ToolSignature } from "../models/agent";
import { DateRange, toDateRange } from "../types/date-range";
import { AgentDataService } from "./agent-data-service";

export const createGetAccountsTool = (
  agentDataService: AgentDataService,
  userId: string,
): ToolSignature<object> => ({
  name: "getAccounts",
  description: "Get all user accounts (both active and archived).",
  inputSchema: z.object(),
  func: async () => {
    const accounts = await agentDataService.getAllAccounts(userId);
    return JSON.stringify(accounts);
  },
});

export const createGetCategoriesTool = (
  agentDataService: AgentDataService,
  userId: string,
): ToolSignature<object> => ({
  name: "getCategories",
  description: "Get all user categories (both active and archived).",
  inputSchema: z.object(),
  func: async () => {
    const categories = await agentDataService.getAllCategories(userId);
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

export const createGetTransactionsTool = (params: {
  agentDataService: AgentDataService;
  userId: string;
  dateRange: DateRange;
}): ToolSignature<GetTransactionsInput> => ({
  name: "getTransactions",
  description: `Get filtered transactions by date range and optionally by single categoryId or accountId. Only returns active (non-archived) transactions. Date format: YYYY-MM-DD. The date range must be within ${params.dateRange.startDate} to ${params.dateRange.endDate}.`,
  inputSchema: getTransactionsInputSchema,
  func: async (input: GetTransactionsInput) => {
    // Validate that input dates are within the allowed date range
    if (
      input.startDate < params.dateRange.startDate ||
      input.endDate > params.dateRange.endDate
    ) {
      return JSON.stringify({
        error: `Date range must be within ${params.dateRange.startDate} to ${params.dateRange.endDate}`,
      });
    }

    // Validate that startDate is not after endDate
    if (input.startDate > input.endDate) {
      return JSON.stringify({
        error: "startDate must not be after endDate",
      });
    }

    const dateRange = toDateRange(input.startDate, input.endDate);
    const transactions = await params.agentDataService.getFilteredTransactions(
      params.userId,
      dateRange,
      input.categoryId,
      input.accountId,
    );
    return JSON.stringify(transactions);
  },
});
