import { type Mocked, vi } from "vitest";
import { CategoryService } from "../../../services/category-service";

export const createMockCategoryService = (): Mocked<CategoryService> => ({
  getCategoriesByUser: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
});
