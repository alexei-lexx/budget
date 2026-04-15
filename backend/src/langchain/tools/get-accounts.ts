import { tool } from "langchain";
import { z } from "zod";
import { AccountRepository } from "../../ports/account-repository";
import { Success } from "../../types/result";
import { agentContextSchema } from "../agents/agent-context";
import { toAccountDto } from "./account-dto";

export enum EntityScope {
  ACTIVE = "ACTIVE",
  ALL = "ALL",
  ARCHIVED = "ARCHIVED",
}

const schema = z.object({
  scope: z
    .enum(EntityScope)
    .describe(
      `Which accounts to retrieve: "${EntityScope.ACTIVE}" for active (non-archived) only, "${EntityScope.ARCHIVED}" for archived only, "${EntityScope.ALL}" for both active and archived`,
    ),
});

export const createGetAccountsTool = (accountRepository: AccountRepository) =>
  tool(
    async ({ scope }, config) => {
      const userId = agentContextSchema.shape.userId.parse(
        config?.context?.userId,
      );
      const accounts =
        await accountRepository.findManyWithArchivedByUserId(userId);

      const filteredAccounts = accounts.filter((account) => {
        if (scope === EntityScope.ALL) return true;
        if (scope === EntityScope.ACTIVE) return !account.isArchived;
        return account.isArchived;
      });

      return Success(filteredAccounts.map(toAccountDto));
    },
    {
      name: "get_accounts",
      description: "Get user accounts filtered by scope.",
      schema,
    },
  );
