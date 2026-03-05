import { z } from "zod";
import { ToolSignature } from "../models/agent";
import { TransactionType } from "../models/transaction";
import { toDateString } from "../types/date";
import { daysBetween } from "../utils/date";
import { AgentDataService } from "./agent-data-service";
import {
  CreateTransactionServiceInput,
  TransactionService,
} from "./transaction-service";

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
  categoryId: z
    .string()
    .optional()
    .describe("Category ID to filter transactions by"),
  accountId: z
    .string()
    .optional()
    .describe("Account ID to filter transactions by"),
});

type GetTransactionsInput = z.infer<typeof getTransactionsInputSchema>;

export const createGetTransactionsTool = (params: {
  agentDataService: AgentDataService;
  userId: string;
}): ToolSignature<GetTransactionsInput> => ({
  name: "getTransactions",
  description: `Get filtered transactions by date range and optionally by single categoryId or accountId. Only returns active (non-archived) transactions. Date format: YYYY-MM-DD. The date range must not exceed 365 days.`,
  inputSchema: getTransactionsInputSchema,
  func: async (input: GetTransactionsInput) => {
    // Validate that startDate is not after endDate
    if (input.startDate > input.endDate) {
      return JSON.stringify({ error: "startDate must not be after endDate" });
    }

    // Validate that date range does not exceed 365 days
    const maxDays = 365;
    if (
      daysBetween(new Date(input.startDate), new Date(input.endDate)) > maxDays
    ) {
      return JSON.stringify({
        error: `Date range must not exceed ${maxDays} days`,
      });
    }

    const transactions = await params.agentDataService.getFilteredTransactions(
      params.userId,
      toDateString(input.startDate),
      toDateString(input.endDate),
      input.categoryId,
      input.accountId,
    );
    return JSON.stringify(transactions);
  },
});

const createTransactionInputSchema = z.object({
  accountId: z.uuid().describe("Account ID to associate the transaction with"),
  amount: z.number().positive().describe("Transaction amount"),
  categoryId: z
    .uuid()
    .optional()
    .describe("Category ID to associate the transaction with"),
  date: z.iso
    .date()
    .transform(toDateString)
    .describe("Transaction date in YYYY-MM-DD format"),
  description: z.string().optional().describe("Short transaction description"),
  type: z
    .enum([
      TransactionType.INCOME,
      TransactionType.EXPENSE,
      TransactionType.REFUND,
    ])
    .describe("Transaction type"),
});

export type CreateTransactionToolInput = z.infer<
  typeof createTransactionInputSchema
>;

interface TransactionData {
  accountId: string;
  amount: number;
  categoryId?: string;
  currency: string;
  date: string;
  description?: string;
  id: string;
  type: TransactionType;
}

export const createCreateTransactionTool = (
  transactionService: TransactionService,
  userId: string,
): ToolSignature<CreateTransactionToolInput> => ({
  name: "createTransaction",
  description: "Create a new transaction.",
  inputSchema: createTransactionInputSchema,
  func: async (input: CreateTransactionToolInput): Promise<string> => {
    const serviceInput: CreateTransactionServiceInput = {
      ...input,
    };
    const created = await transactionService.createTransaction(
      serviceInput,
      userId,
    );

    const transactionData: TransactionData = {
      accountId: created.accountId,
      amount: created.amount,
      categoryId: created.categoryId,
      currency: created.currency,
      date: created.date,
      description: created.description,
      id: created.id,
      type: created.type,
    };

    return JSON.stringify(transactionData);
  },
});
