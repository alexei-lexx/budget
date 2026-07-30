import { z } from "zod";
import { CategoryType } from "../models/category";
import { CategoryService } from "../services/category-service";
import { Failure, Result, Success } from "../types/result";
import { CategoryDto, toCategoryDto } from "./category-dto";

export async function createCategory(
  {
    name,
    type,
    excludeFromReports,
  }: { name: string; type: CategoryType; excludeFromReports?: boolean },
  {
    categoryService,
    userId,
  }: {
    categoryService: CategoryService;
    userId: string;
  },
): Promise<Result<CategoryDto>> {
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

export const inputSchema = {
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
};

export const description = `
Create a new category for the user.

Category is a classification system for transactions.

Before calling, check the user's existing active (non-archived) categories.
If the requested name is a semantic near-variant of an existing active one
(pluralisation, typo, abbreviation, or synonym)
ask the user to confirm before creating.
Archived categories are not considered — reusing an archived category's name is not a duplicate.

Set excludeFromReports to true if the user wants transactions in this category
excluded from financial reports and spending/income calculations.
`.trim();
