import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CategoryDto, toCategoryDto } from "../../langchain/tools/category-dto";
import { CategoryService } from "../../services/category-service";
import { EntityScope } from "../../types/entity-scope";
import { Result, Success } from "../../types/result";
import { toToolResult } from "./to-tool-result";

export async function getCategories(
  { scope }: { scope: EntityScope },
  {
    categoryService,
    userId,
  }: {
    categoryService: CategoryService;
    userId: string;
  },
): Promise<Result<CategoryDto[]>> {
  const categories = await categoryService.getCategoriesByUser(userId, {
    scope,
  });

  return Success(categories.map(toCategoryDto));
}

const inputSchema = {
  scope: z
    .enum(EntityScope)
    .describe(
      `Which categories to retrieve: "${EntityScope.ACTIVE}" for active (non-archived) only, "${EntityScope.ARCHIVED}" for archived only, "${EntityScope.ALL}" for both active and archived`,
    ),
};

const description = `
Get user categories filtered by scope.

Category is a classification system for transactions.

- The user can have multiple categories
- Each category has a name, a type (INCOME, EXPENSE), and an archived flag
- Include archived categories for historical queries
- A category can be marked to exclude its transactions from financial reports
- Report-excluded categories should not count towards spending or income totals
`.trim();

export function registerGetCategoriesTool(
  server: McpServer,
  deps: { categoryService: CategoryService; userId: string },
): void {
  server.registerTool(
    "get_categories",
    { description, inputSchema },
    async ({ scope }) => toToolResult(await getCategories({ scope }, deps)),
  );
}
