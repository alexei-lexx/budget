import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { CategoryDto, toCategoryDto } from "../../langchain/tools/category-dto";
import { CategoryType } from "../../models/category";
import { CategoryService } from "../../services/category-service";
import { Failure, Result, Success } from "../../types/result";
import { buildGuideTokensField, verifyGuideTokens } from "./guides";
import { toToolResult } from "./to-tool-result";

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

  try {
    const created = await categoryService.createCategory({
      userId,
      name,
      type,
      excludeFromReports: excludeFromReports ?? false,
    });

    return Success(toCategoryDto(created));
  } catch (error) {
    if (error instanceof Error) {
      return Failure(error.message);
    }
    throw error;
  }
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

export function registerCreateCategoryTool(
  server: McpServer,
  deps: { categoryService: CategoryService; userId: string },
): void {
  server.registerTool(
    "create_category",
    { description, inputSchema },
    async (input) => toToolResult(await createCategory(input, deps)),
  );
}
