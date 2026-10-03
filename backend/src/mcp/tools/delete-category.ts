import { Failure, Result } from "ts-result";
import { z } from "zod";
import { CategoryDto, toCategoryDto } from "../../langchain/tools/category-dto";
import { CategoryService } from "../../services/category-service";
import { buildGuideTokensField, verifyGuideTokens } from "./guides";
import { RECENT_WINDOW_TEXT, isRecentlyCreated } from "./recently-created";
import { Tool } from "./tool";

const requiredGuides = ["basics"] as const;

export async function deleteCategory(
  {
    id,
    guideTokens,
  }: {
    id: string;
    guideTokens: string[];
  },
  {
    categoryService,
    userId,
  }: {
    categoryService: CategoryService;
    userId: string;
  },
): Promise<Result<CategoryDto>> {
  const verification = verifyGuideTokens({
    guideTokens,
    requiredGuides,
  });
  if (!verification.success) return verification;

  const lookup = await categoryService.getCategoriesByUser(userId, {
    scope: "ACTIVE",
  });
  if (!lookup.success) return lookup;

  const category = lookup.data.find((candidate) => candidate.id === id);
  if (!category) return Failure("Category not found");

  if (!isRecentlyCreated(category.createdAt)) {
    return Failure(
      `Only categories created within the last ${RECENT_WINDOW_TEXT} can be deleted by an agent. Delete older categories in the app.`,
    );
  }

  const result = await categoryService.deleteCategory(id, userId);

  return result.map(toCategoryDto);
}

const inputSchema = z.object({
  id: z.uuid().describe("Category ID to delete"),
  guideTokens: buildGuideTokensField(requiredGuides),
});

const description = `
Delete an existing category.

- Only categories created within the last ${RECENT_WINDOW_TEXT} can be deleted
- The category's transactions are kept
`.trim();

export function createDeleteCategoryTool(deps: {
  categoryService: CategoryService;
  userId: string;
}): Tool<{
  id: string;
  guideTokens: string[];
}> {
  return {
    name: "delete_category",
    description,
    inputSchema,
    annotations: { destructiveHint: true },
    run: (input) => deleteCategory(input, deps),
  };
}
