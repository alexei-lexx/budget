import { z } from "zod";
import { EntityScope, IAgentDataService } from "../agent-data-service";
import { ToolSignature } from "../ports/agent";

const getAccountsInputSchema = z.object({
  scope: z
    .enum(EntityScope)
    .describe(
      `Which accounts to retrieve: "${EntityScope.ACTIVE}" for active (non-archived) only, "${EntityScope.ARCHIVED}" for archived only, "${EntityScope.ALL}" for both active and archived`,
    ),
});

type GetAccountsInput = z.infer<typeof getAccountsInputSchema>;

export const createGetAccountsTool = (
  agentDataService: IAgentDataService,
  userId: string,
): ToolSignature<GetAccountsInput> => ({
  name: "getAccounts",
  description: "Get user accounts filtered by scope.",
  inputSchema: getAccountsInputSchema,
  func: async (input: GetAccountsInput) => {
    const accounts = await agentDataService.getAccounts(userId, input.scope);

    return JSON.stringify(accounts);
  },
});
