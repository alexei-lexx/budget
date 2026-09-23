import { z } from "zod";
import { CategoryDto, toCategoryDto } from "../../langchain/tools/category-dto";
import { CategoryService } from "../../services/category-service";
import { ENTITY_SCOPES, EntityScope } from "../../types/entity-scope";
import { assertGuideTokens, buildGuideTokensField } from "./guides";
import { Tool } from "./tool";

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
): Promise<CategoryDto[]> {
  assertGuideTokens({
    guideTokens,
    requiredGuides,
  });

  const categories = await categoryService.getCategoriesByUser(userId, {
    scope,
  });

  return categories.map(toCategoryDto);
}

const inputSchema = z.object({
  scope: z
    .enum(ENTITY_SCOPES)
    .describe(
      "Which categories to retrieve: active (non-archived) only, archived only, all (both active and archived)",
    ),
  guideTokens: buildGuideTokensField(requiredGuides),
});

export function createGetCategoriesTool(deps: {
  categoryService: CategoryService;
  userId: string;
}): Tool<{ scope: EntityScope; guideTokens: string[] }> {
  return {
    name: "get_categories",
    description: "Get user categories filtered by scope.",
    inputSchema,
    run: (input) => getCategories(input, deps),
  };
}
