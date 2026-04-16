import { Category, CategoryType } from "../../models/category";

export interface CategoryDto {
  id: string;
  isArchived: boolean;
  name: string;
  type: CategoryType;
}

export const toCategoryDto = (category: Category): CategoryDto => ({
  id: category.id,
  isArchived: category.isArchived,
  name: category.name,
  type: category.type,
});
