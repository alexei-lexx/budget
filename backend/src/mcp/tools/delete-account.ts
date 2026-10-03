import { Failure, Result } from "ts-result";
import { z } from "zod";
import { AccountDto, toAccountDto } from "../../langchain/tools/account-dto";
import { AccountService } from "../../services/account-service";
import { buildGuideTokensField, verifyGuideTokens } from "./guides";
import { RECENT_WINDOW_TEXT, isRecentlyCreated } from "./recently-created";
import { Tool } from "./tool";

const requiredGuides = ["basics"] as const;

export async function deleteAccount(
  {
    id,
    guideTokens,
  }: {
    id: string;
    guideTokens: string[];
  },
  {
    accountService,
    userId,
  }: {
    accountService: AccountService;
    userId: string;
  },
): Promise<Result<AccountDto>> {
  const verification = verifyGuideTokens({
    guideTokens,
    requiredGuides,
  });
  if (!verification.success) return verification;

  const lookup = await accountService.getAccountsByUser(userId, "ACTIVE");
  if (!lookup.success) return lookup;

  const account = lookup.data.find((candidate) => candidate.id === id);
  if (!account) return Failure("Account not found");

  if (!isRecentlyCreated(account.createdAt)) {
    return Failure(
      `Only accounts created within the last ${RECENT_WINDOW_TEXT} can be deleted by an agent. Delete older accounts in the app.`,
    );
  }

  const result = await accountService.deleteAccount(id, userId);

  return result.map(toAccountDto);
}

const inputSchema = z.object({
  id: z.uuid().describe("Account ID to delete"),
  guideTokens: buildGuideTokensField(requiredGuides),
});

const description = `
Delete an existing account.

- Only accounts created within the last ${RECENT_WINDOW_TEXT} can be deleted
- The account's transactions are kept
`.trim();

export function createDeleteAccountTool(deps: {
  accountService: AccountService;
  userId: string;
}): Tool<{
  id: string;
  guideTokens: string[];
}> {
  return {
    name: "delete_account",
    description,
    inputSchema,
    annotations: { destructiveHint: true },
    run: (input) => deleteAccount(input, deps),
  };
}
