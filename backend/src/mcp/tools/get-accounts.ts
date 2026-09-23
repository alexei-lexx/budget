import { z } from "zod";
import { AccountDto, toAccountDto } from "../../langchain/tools/account-dto";
import { AccountService } from "../../services/account-service";
import { ENTITY_SCOPES, EntityScope } from "../../types/entity-scope";
import { assertGuideTokens, buildGuideTokensField } from "./guides";
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
): Promise<AccountDto[]> {
  assertGuideTokens({
    guideTokens,
    requiredGuides,
  });

  const accounts = await accountService.getAccountsByUser(userId, scope);

  return accounts.map(toAccountDto);
}

const inputSchema = z.object({
  scope: z
    .enum(ENTITY_SCOPES)
    .describe(
      "Which accounts to retrieve: active (non-archived) only, archived only, all (both active and archived)",
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
