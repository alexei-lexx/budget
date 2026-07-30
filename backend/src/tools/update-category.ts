import { z } from "zod";
import { CategoryType } from "../models/category";
import { ModelError } from "../models/model-error";
import { UpdateCategoryInput } from "../ports/category-repository";
import { BusinessError } from "../services/business-error";
import { CategoryService } from "../services/category-service";
import { Failure, Result, Success } from "../types/result";
import { CategoryDto, toCategoryDto } from "./category-dto";

export async function handler(
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
    if (error instanceof BusinessError || error instanceof ModelError) {
      return Failure(error.message);
    }
    throw error;
  }
}

export const inputSchema = {
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

export const description = `
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
