import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  TransactionDto,
  toTransactionDto,
} from "../../langchain/tools/transaction-dto";
import { TransactionType } from "../../models/transaction";
import {
  CreateTransactionServiceInput,
  TransactionService,
} from "../../services/transaction-service";
import { toDateString } from "../../types/date";
import { Failure, Result, Success } from "../../types/result";
import { buildGuideTokensField, verifyGuideTokens } from "./guides";
import { toToolResult } from "./to-tool-result";

const requiredGuides = ["basics", "create-transaction"] as const;

export async function createTransaction(
  {
    guideTokens,
    ...input
  }: CreateTransactionServiceInput & { guideTokens: string[] },
  {
    transactionService,
    userId,
  }: {
    transactionService: TransactionService;
    userId: string;
  },
): Promise<Result<TransactionDto>> {
  const verification = verifyGuideTokens({
    guideTokens,
    requiredGuides,
  });
  if (!verification.success) return verification;

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

const inputSchema = z.object({
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
  guideTokens: buildGuideTokensField(requiredGuides),
});

const description = `
Create a new transaction.

- Currency is inherited from the account, not specified separately
- Only ${TransactionType.INCOME}, ${TransactionType.EXPENSE}, and ${TransactionType.REFUND} can be created here
- Transfers are not supported by this tool
`.trim();

export function registerCreateTransactionTool(
  server: McpServer,
  deps: { transactionService: TransactionService; userId: string },
): void {
  server.registerTool(
    "create_transaction",
    { description, inputSchema },
    async (input) => toToolResult(await createTransaction(input, deps)),
  );
}
