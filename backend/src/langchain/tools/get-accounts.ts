import { tool } from "langchain";
import { z } from "zod";
import { AccountService } from "../../services/account-service";
import { EntityScope } from "../../types/entity-scope";
import { Success } from "../../types/result";
import { agentContextSchema } from "../agents/agent-context";
import { toAccountDto } from "./account-dto";

const schema = z.object({
  scope: z
    .enum(EntityScope)
    .describe(
      `Which accounts to retrieve: "${EntityScope.ACTIVE}" for active (non-archived) only, "${EntityScope.ARCHIVED}" for archived only, "${EntityScope.ALL}" for both active and archived`,
    ),
});

export const createGetAccountsTool = (accountService: AccountService) =>
  tool(
    async ({ scope }, config) => {
      const userId = agentContextSchema.shape.userId.parse(
        config?.context?.userId,
      );
      const accounts = await accountService.getAccountsByUser(userId, scope);

      return Success(accounts.map(toAccountDto));
    },
    {
      name: "get_accounts",
      description: "Get user accounts filtered by scope.",
      schema,
    },
  );
