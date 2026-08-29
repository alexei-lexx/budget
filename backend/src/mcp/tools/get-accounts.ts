import { z } from "zod";
import { AccountDto, toAccountDto } from "../../langchain/tools/account-dto";
import { AccountService } from "../../services/account-service";
import { EntityScope } from "../../types/entity-scope";
import { Result, Success } from "../../types/result";
import { buildGuideTokensField, verifyGuideTokens } from "./guides";
import { Tool } from "./tool";

const requiredGuides = ["basics"] as const;

export async function getAccounts(
  { scope, guideTokens }: { scope: EntityScope; guideTokens: string[] },
  {
    accountService,
    userId,
  }: {
    accountService: AccountService;
    userId: string;
  },
): Promise<Result<AccountDto[]>> {
  const verification = verifyGuideTokens({
    guideTokens,
    requiredGuides,
  });
  if (!verification.success) return verification;

  const accounts = await accountService.getAccountsByUser(userId, scope);

  return Success(accounts.map(toAccountDto));
}

const inputSchema = z.object({
  scope: z
    .enum(EntityScope)
    .describe(
      `Which accounts to retrieve: "${EntityScope.ACTIVE}" for active (non-archived) only, "${EntityScope.ARCHIVED}" for archived only, "${EntityScope.ALL}" for both active and archived`,
    ),
  guideTokens: buildGuideTokensField(requiredGuides),
});

export function createGetAccountsTool(deps: {
  accountService: AccountService;
  userId: string;
}): Tool<{ scope: EntityScope; guideTokens: string[] }> {
  return {
    name: "get_accounts",
    description: "Get user accounts filtered by scope.",
    inputSchema,
    run: (input) => getAccounts(input, deps),
  };
}
