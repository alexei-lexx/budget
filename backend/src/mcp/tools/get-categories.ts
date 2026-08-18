import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { CategoryDto, toCategoryDto } from "../../langchain/tools/category-dto";
import { CategoryService } from "../../services/category-service";
import { EntityScope } from "../../types/entity-scope";
import { Result, Success } from "../../types/result";
import { buildGuideTokensField, verifyGuideTokens } from "./guides";
import { toToolResult } from "./to-tool-result";

const requiredGuides = ["basics"] as const;

export async function getCategories(
  { scope, guideTokens }: { scope: EntityScope; guideTokens: string[] },
  {
    categoryService,
    userId,
  }: {
    categoryService: CategoryService;
    userId: string;
  },
): Promise<Result<CategoryDto[]>> {
  const verification = verifyGuideTokens({
    guideTokens,
    requiredGuides,
  });
  if (!verification.success) return verification;

  const categories = await categoryService.getCategoriesByUser(userId, {
    scope,
  });

  return Success(categories.map(toCategoryDto));
}

const inputSchema = z.object({
  scope: z
    .enum(EntityScope)
    .describe(
      `Which categories to retrieve: "${EntityScope.ACTIVE}" for active (non-archived) only, "${EntityScope.ARCHIVED}" for archived only, "${EntityScope.ALL}" for both active and archived`,
    ),
  guideTokens: buildGuideTokensField(requiredGuides),
});

export function registerGetCategoriesTool(
  server: McpServer,
  deps: { categoryService: CategoryService; userId: string },
): void {
  server.registerTool(
    "get_categories",
    {
      description: "Get user categories filtered by scope.",
      inputSchema,
    },
    async ({ scope, guideTokens }) =>
      toToolResult(await getCategories({ scope, guideTokens }, deps)),
  );
}
