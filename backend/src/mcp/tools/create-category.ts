import { z } from "zod";
import { CategoryDto, toCategoryDto } from "../../langchain/tools/category-dto";
import { CategoryType } from "../../models/category";
import { CategoryService } from "../../services/category-service";
import { Result, Success } from "../../types/result";
import { buildGuideTokensField, verifyGuideTokens } from "./guides";
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
): Promise<Result<CategoryDto>> {
  const verification = verifyGuideTokens({
    guideTokens,
    requiredGuides,
  });
  if (!verification.success) return verification;

  const created = await categoryService.createCategory({
    userId,
    name,
    type,
    excludeFromReports: excludeFromReports ?? false,
  });

  return Success(toCategoryDto(created));
}

const inputSchema = z.object({
  name: z.string().describe("Category name"),
  type: z
    .enum(CategoryType)
    .describe(
      `Category type: ${CategoryType.INCOME} or ${CategoryType.EXPENSE}`,
    ),
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
