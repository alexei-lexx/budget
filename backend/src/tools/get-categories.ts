import { z } from "zod";
import { CategoryService } from "../services/category-service";
import { EntityScope } from "../types/entity-scope";
import { Result, Success } from "../types/result";
import { CategoryDto, toCategoryDto } from "./category-dto";

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

export const inputSchema = {
  scope: z
    .enum(EntityScope)
    .describe(
      `Which categories to retrieve: "${EntityScope.ACTIVE}" for active (non-archived) only, "${EntityScope.ARCHIVED}" for archived only, "${EntityScope.ALL}" for both active and archived`,
    ),
};

export const description = `
Get user categories filtered by scope.

Category is a classification system for transactions.

- The user can have multiple categories
- Each category has a name, a type (INCOME, EXPENSE), and an archived flag
- Include archived categories for historical queries
- A category can be marked to exclude its transactions from financial reports
- Report-excluded categories should not count towards spending or income totals
`.trim();
