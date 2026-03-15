import { z } from "zod";
import { EntityScope, IAgentDataService } from "../agent-data-service";
import { ToolSignature } from "../ports/agent";

const getCategoriesInputSchema = z.object({
  scope: z
    .enum(EntityScope)
    .describe(
      `Which categories to retrieve: "${EntityScope.ACTIVE}" for active (non-archived) only, "${EntityScope.ARCHIVED}" for archived only, "${EntityScope.ALL}" for both active and archived`,
    ),
});

type GetCategoriesInput = z.infer<typeof getCategoriesInputSchema>;

export const createGetCategoriesTool = (
  agentDataService: IAgentDataService,
  userId: string,
): ToolSignature<GetCategoriesInput> => ({
  name: "getCategories",
  description:
    "Get user categories filtered by scope. Each category includes recent usage examples showing how similar transactions were previously categorised.",
  inputSchema: getCategoriesInputSchema,
  func: async (input: GetCategoriesInput) => {
    const categories = await agentDataService.getCategories(
      userId,
      input.scope,
    );

    return JSON.stringify(categories);
  },
});
