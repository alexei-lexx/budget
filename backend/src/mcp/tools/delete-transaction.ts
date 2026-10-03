import { Failure, Result } from "ts-result";
import { z } from "zod";
import {
  TransactionDto,
  toTransactionDto,
} from "../../langchain/tools/transaction-dto";
import { TransactionService } from "../../services/transaction-service";
import { buildGuideTokensField, verifyGuideTokens } from "./guides";
import { RECENT_WINDOW_TEXT, isRecentlyCreated } from "./recently-created";
import { Tool } from "./tool";

const requiredGuides = ["basics"] as const;

export async function deleteTransaction(
  {
    id,
    guideTokens,
  }: {
    id: string;
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

  const lookup = await transactionService.getTransactionById(id, userId);
  if (!lookup.success) return lookup;

  if (!isRecentlyCreated(lookup.data.createdAt)) {
    return Failure(
      `Only transactions created within the last ${RECENT_WINDOW_TEXT} can be deleted by an agent. Delete older transactions in the app.`,
    );
  }

  const result = await transactionService.deleteTransaction(id, userId);

  return result.map(toTransactionDto);
}

const inputSchema = z.object({
  id: z.uuid().describe("Transaction ID to delete"),
  guideTokens: buildGuideTokensField(requiredGuides),
});

const description = `
Delete an existing transaction.

- Only transactions created within the last ${RECENT_WINDOW_TEXT} can be deleted
- Transfers cannot be deleted through this tool
`.trim();

export function createDeleteTransactionTool(deps: {
  transactionService: TransactionService;
  userId: string;
}): Tool<{
  id: string;
  guideTokens: string[];
}> {
  return {
    name: "delete_transaction",
    description,
    inputSchema,
    annotations: { destructiveHint: true },
    run: (input) => deleteTransaction(input, deps),
  };
}
