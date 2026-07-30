import { z } from "zod";
import { AccountService } from "../services/account-service";
import { EntityScope } from "../types/entity-scope";
import { Result, Success } from "../types/result";
import { AccountDto, toAccountDto } from "./account-dto";

export async function getAccounts(
  { scope }: { scope: EntityScope },
  {
    accountService,
    userId,
  }: {
    accountService: AccountService;
    userId: string;
  },
): Promise<Result<AccountDto[]>> {
  const accounts = await accountService.getAccountsByUser(userId, scope);

  return Success(accounts.map(toAccountDto));
}

export const inputSchema = {
  scope: z
    .enum(EntityScope)
    .describe(
      `Which accounts to retrieve: "${EntityScope.ACTIVE}" for active (non-archived) only, "${EntityScope.ARCHIVED}" for archived only, "${EntityScope.ALL}" for both active and archived`,
    ),
};

export const description = `
Get user accounts filtered by scope.

Account is a place where money is stored.

- The user can have multiple accounts
- Each account has a name, a currency, and an archived flag
- Include archived accounts for historical queries
`.trim();
