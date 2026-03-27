import { z } from "zod";
import { Success } from "../../types/result";
import { AccountRepository } from "../ports/account-repository";
import { ToolSignature } from "../ports/agent";

export enum EntityScope {
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
  ALL = "ALL",
}

const getAccountsInputSchema = z.object({
  scope: z
    .enum(EntityScope)
    .describe(
      `Which accounts to retrieve: "${EntityScope.ACTIVE}" for active (non-archived) only, "${EntityScope.ARCHIVED}" for archived only, "${EntityScope.ALL}" for both active and archived`,
    ),
});

type GetAccountsInput = z.infer<typeof getAccountsInputSchema>;

interface AccountData {
  id: string;
  name: string;
  currency: string;
  isArchived: boolean;
}

export const createGetAccountsTool = (
  accountRepository: AccountRepository,
  userId: string,
): ToolSignature<GetAccountsInput, AccountData[]> => ({
  name: "getAccounts",
  description: "Get user accounts filtered by scope.",
  inputSchema: getAccountsInputSchema,
  func: async (input: GetAccountsInput) => {
    const accounts =
      await accountRepository.findManyWithArchivedByUserId(userId);

    const filteredAccounts = accounts.filter((account) => {
      if (input.scope === EntityScope.ALL) return true;
      if (input.scope === EntityScope.ACTIVE) return !account.isArchived;
      return account.isArchived;
    });

    const accountDataList: AccountData[] = filteredAccounts.map((account) => ({
      id: account.id,
      name: account.name,
      currency: account.currency,
      isArchived: account.isArchived,
    }));

    return Success(accountDataList);
  },
});
