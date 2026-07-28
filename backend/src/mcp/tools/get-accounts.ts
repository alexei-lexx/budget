import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AccountDto, toAccountDto } from "../../langchain/tools/account-dto";
import { EntityScope } from "../../langchain/tools/get-accounts";
import { AccountRepository } from "../../ports/account-repository";
import { Result, Success } from "../../types/result";
import { toToolResult } from "./to-tool-result";

export async function getAccounts(
  { scope }: { scope: EntityScope },
  {
    accountRepository,
    userId,
  }: {
    accountRepository: AccountRepository;
    userId: string;
  },
): Promise<Result<AccountDto[]>> {
  const accounts = await accountRepository.findManyWithArchivedByUserId(userId);

  const filteredAccounts = accounts.filter((account) => {
    if (scope === EntityScope.ALL) return true;
    if (scope === EntityScope.ACTIVE) return !account.isArchived;
    return account.isArchived;
  });

  return Success(filteredAccounts.map(toAccountDto));
}

const inputSchema = {
  scope: z
    .enum(EntityScope)
    .describe(
      `Which accounts to retrieve: "${EntityScope.ACTIVE}" for active (non-archived) only, "${EntityScope.ARCHIVED}" for archived only, "${EntityScope.ALL}" for both active and archived`,
    ),
};

const description = `
Get user accounts filtered by scope.

Account is a place where money is stored.

- The user can have multiple accounts
- Each account has a name, a currency, and an archived flag
- Include archived accounts for historical queries
`.trim();

export function registerGetAccountsTool(
  server: McpServer,
  deps: { accountRepository: AccountRepository; userId: string },
): void {
  server.registerTool(
    "get_accounts",
    { description, inputSchema },
    async ({ scope }) => toToolResult(await getAccounts({ scope }, deps)),
  );
}
