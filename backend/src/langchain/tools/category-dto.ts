import { Category, CategoryType } from "../../models/category";

export interface CategoryDto {
  excludeFromReports: boolean;
  id: string;
  isArchived: boolean;
  name: string;
  type: CategoryType;
}

export const toCategoryDto = (category: Category): CategoryDto => ({
  excludeFromReports: category.excludeFromReports,
  id: category.id,
  isArchived: category.isArchived,
  name: category.name,
  type: category.type,
});
