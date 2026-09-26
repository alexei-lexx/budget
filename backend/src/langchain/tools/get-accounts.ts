import { tool } from "langchain";
import { z } from "zod";
import { AccountService } from "../../services/account-service";
import { ENTITY_SCOPES } from "../../types/entity-scope";
import { Success } from "../../types/result";
import { agentContextSchema } from "../agents/agent-context";
import { toAccountDto } from "./account-dto";

const schema = z.object({
  scope: z
    .enum(ENTITY_SCOPES)
    .describe(
      "Which accounts to retrieve: active (non-archived) only, archived only, all (both active and archived)",
    ),
});

export const createGetAccountsTool = (accountService: AccountService) =>
  tool(
    async ({ scope }, config) => {
      const userId = agentContextSchema.shape.userId.parse(
        config?.context?.userId,
      );
      const result = await accountService.getAccountsByUser(userId, scope);

      if (!result.success) return result;

      return Success(result.data.map(toAccountDto));
    },
    {
      name: "get_accounts",
      description: "Get user accounts filtered by scope.",
      schema,
    },
  );
