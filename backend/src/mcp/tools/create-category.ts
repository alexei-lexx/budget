import { z } from "zod";
import { CategoryDto, toCategoryDto } from "../../langchain/tools/category-dto";
import { CATEGORY_TYPES, CategoryType } from "../../models/category";
import { CategoryService } from "../../services/category-service";
import { assertGuideTokens, buildGuideTokensField } from "./guides";
import { Tool } from "./tool";

const requiredGuides = ["basics"] as const;

export async function createCategory(
  {
    name,
    type,
    excludeFromReports,
    guideTokens,
  }: {
    name: string;
    type: CategoryType;
    excludeFromReports?: boolean;
    guideTokens: string[];
  },
  {
    categoryService,
    userId,
  }: {
    categoryService: CategoryService;
    userId: string;
  },
): Promise<CategoryDto> {
  assertGuideTokens({
    guideTokens,
    requiredGuides,
  });

  const created = await categoryService.createCategory({
    userId,
    name,
    type,
    excludeFromReports: excludeFromReports ?? false,
  });

  return toCategoryDto(created);
}

const inputSchema = z.object({
  name: z.string().describe("Category name"),
  type: z.enum(CATEGORY_TYPES).describe("Category type"),
  excludeFromReports: z
    .boolean()
    .optional()
    .describe(
      "Whether to exclude transactions in this category from financial reports. Defaults to false.",
    ),
  guideTokens: buildGuideTokensField(requiredGuides),
});

const description = `
Create a new category for the user.

Before calling, check the user's existing active (non-archived) categories.
If the requested name is a semantic near-variant of an existing active one
(pluralisation, typo, abbreviation, or synonym)
ask the user to confirm before creating.
Archived categories are not considered — reusing an archived category's name is not a duplicate.
`.trim();

export function createCreateCategoryTool(deps: {
  categoryService: CategoryService;
  userId: string;
}): Tool<{
  name: string;
  type: CategoryType;
  excludeFromReports?: boolean;
  guideTokens: string[];
}> {
  return {
    name: "create_category",
    description,
    inputSchema,
    run: (input) => createCategory(input, deps),
  };
}
