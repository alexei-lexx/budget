import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AccountDto, toAccountDto } from "../../langchain/tools/account-dto";
import { AccountService } from "../../services/account-service";
import { EntityScope } from "../../types/entity-scope";
import { Result, Success } from "../../types/result";
import { buildGuideTokensField, verifyGuideTokens } from "./guides";
import { toToolResult } from "./to-tool-result";

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

const inputSchema = {
  scope: z
    .enum(EntityScope)
    .describe(
      `Which accounts to retrieve: "${EntityScope.ACTIVE}" for active (non-archived) only, "${EntityScope.ARCHIVED}" for archived only, "${EntityScope.ALL}" for both active and archived`,
    ),
  guideTokens: buildGuideTokensField(requiredGuides),
};

export function registerGetAccountsTool(
  server: McpServer,
  deps: { accountService: AccountService; userId: string },
): void {
  server.registerTool(
    "get_accounts",
    {
      description: "Get user accounts filtered by scope.",
      inputSchema,
    },
    async ({ scope, guideTokens }) =>
      toToolResult(await getAccounts({ scope, guideTokens }, deps)),
  );
}
