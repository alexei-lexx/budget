import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CategoryDto, toCategoryDto } from "../../langchain/tools/category-dto";
import { CategoryType } from "../../models/category";
import { UpdateCategoryInput } from "../../ports/category-repository";
import { CategoryService } from "../../services/category-service";
import { Failure, Result, Success } from "../../types/result";
import { toToolResult } from "./to-tool-result";

export async function updateCategory(
  {
    id,
    name,
    type,
    excludeFromReports,
  }: {
    id: string;
    name?: string;
    type?: CategoryType;
    excludeFromReports?: boolean;
  },
  {
    categoryService,
    userId,
  }: {
    categoryService: CategoryService;
    userId: string;
  },
): Promise<Result<CategoryDto>> {
  try {
    const input: UpdateCategoryInput = {
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(excludeFromReports !== undefined && { excludeFromReports }),
    };

    const updated = await categoryService.updateCategory(id, userId, input);

    return Success(toCategoryDto(updated));
  } catch (error) {
    if (error instanceof Error) {
      return Failure(error.message);
    }
    throw error;
  }
}

const inputSchema = {
  id: z.uuid().describe("Category ID to update"),
  name: z.string().optional().describe("New category name"),
  type: z
    .enum(CategoryType)
    .optional()
    .describe(
      `New category type: ${CategoryType.INCOME} or ${CategoryType.EXPENSE}`,
    ),
  excludeFromReports: z
    .boolean()
    .optional()
    .describe(
      "New report-exclusion setting. Whether to exclude transactions in this category from financial reports.",
    ),
};

const description = `
Update an existing category's name, type, and/or report-exclusion setting.

Before calling, check the user's existing active (non-archived) categories
to resolve the category id (never guess it or accept it from user input).
If the requested new name is a semantic near-variant of another existing active category
(pluralisation, typo, abbreviation, or synonym)
ask the user to confirm before updating.
Archived categories are not considered — reusing an archived category's name is not a duplicate.

Set excludeFromReports to control whether transactions in this category
are excluded from financial reports and spending/income calculations.
`.trim();

export function registerUpdateCategoryTool(
  server: McpServer,
  deps: { categoryService: CategoryService; userId: string },
): void {
  server.registerTool(
    "update_category",
    { description, inputSchema },
    async (input) => toToolResult(await updateCategory(input, deps)),
  );
}
