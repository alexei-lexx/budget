import { z } from "zod";
import { TransactionType } from "../models/transaction";
import {
  CreateTransactionServiceInput,
  TransactionService,
} from "../services/transaction-service";
import { toDateString } from "../types/date";
import { Failure, Result, Success } from "../types/result";
import { TransactionDto, toTransactionDto } from "./transaction-dto";

export const CREATE_TRANSACTION_TOOL_NAME = "create_transaction";

export async function createTransaction(
  input: CreateTransactionServiceInput,
  {
    transactionService,
    userId,
  }: {
    transactionService: TransactionService;
    userId: string;
  },
): Promise<Result<TransactionDto>> {
  try {
    const created = await transactionService.createTransaction(input, userId);

    return Success(toTransactionDto(created));
  } catch (error) {
    if (error instanceof Error) {
      return Failure(error.message);
    }
    throw error;
  }
}

export const inputSchema = {
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
  description: z
    .string()
    .max(500)
    .optional()
    .describe("Short transaction description"),
  type: z
    .enum([
      TransactionType.INCOME,
      TransactionType.EXPENSE,
      TransactionType.REFUND,
    ])
    .describe("Transaction type"),
};

export const description = `
Create a new transaction.

- Currency is inherited from the account, not specified separately
- Only ${TransactionType.INCOME}, ${TransactionType.EXPENSE}, and ${TransactionType.REFUND} can be created here
- Transfers are not supported by this tool
`.trim();
