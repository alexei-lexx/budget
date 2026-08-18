import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  TransactionDto,
  toTransactionDto,
} from "../../langchain/tools/transaction-dto";
import {
  NonTransferTransactionType,
  TransactionType,
} from "../../models/transaction";
import {
  TransactionService,
  UpdateTransactionServiceInput,
} from "../../services/transaction-service";
import { toDateString } from "../../types/date";
import { Failure, Result, Success } from "../../types/result";
import { buildGuideTokensField, verifyGuideTokens } from "./guides";
import { toToolResult } from "./to-tool-result";

const requiredGuides = ["basics"] as const;

export async function updateTransaction(
  {
    id,
    accountId,
    amount,
    categoryId,
    date,
    description,
    type,
    guideTokens,
  }: {
    id: string;
    accountId?: string;
    amount?: number;
    categoryId?: string | null;
    date?: string;
    description?: string | null;
    type?: NonTransferTransactionType;
    guideTokens: string[];
  },
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
    const input: UpdateTransactionServiceInput = {
      ...(accountId !== undefined && { accountId }),
      ...(amount !== undefined && { amount }),
      ...(categoryId !== undefined && { categoryId }),
      ...(date !== undefined && { date: toDateString(date) }),
      ...(description !== undefined && { description }),
      ...(type !== undefined && { type }),
    };

    const updated = await transactionService.updateTransaction(
      id,
      userId,
      input,
    );

    return Success(toTransactionDto(updated));
  } catch (error) {
    if (error instanceof Error) {
      return Failure(error.message);
    }
    throw error;
  }
}

const inputSchema = z.object({
  id: z.uuid().describe("Transaction ID to update"),
  accountId: z
    .uuid()
    .optional()
    .describe("New account ID to associate the transaction with"),
  amount: z.number().positive().optional().describe("New transaction amount"),
  categoryId: z
    .uuid()
    .nullable()
    .optional()
    .describe(
      "New category ID to associate the transaction with. Pass null to remove the current category.",
    ),
  date: z.iso
    .date()
    .optional()
    .describe("New transaction date in YYYY-MM-DD format"),
  description: z
    .string()
    .max(500)
    .nullable()
    .optional()
    .describe(
      "New short transaction description. Pass null to clear the current description.",
    ),
  type: z
    .enum([
      TransactionType.INCOME,
      TransactionType.EXPENSE,
      TransactionType.REFUND,
    ])
    .optional()
    .describe("New transaction type"),
  guideTokens: buildGuideTokensField(requiredGuides),
});

const description = `
Update an existing transaction.

- Only the supplied fields are changed
- Pass null for categoryId or description to clear them; omit them to leave unchanged
- Only ${TransactionType.INCOME}, ${TransactionType.EXPENSE}, and ${TransactionType.REFUND} can be set here
- Transfers cannot be created, updated or converted to through this tool
`.trim();

export function registerUpdateTransactionTool(
  server: McpServer,
  deps: { transactionService: TransactionService; userId: string },
): void {
  server.registerTool(
    "update_transaction",
    { description, inputSchema },
    async (input) => toToolResult(await updateTransaction(input, deps)),
  );
}
