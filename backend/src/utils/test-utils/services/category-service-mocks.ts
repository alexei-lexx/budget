import { jest } from "@jest/globals";
import { CategoryService } from "../../../services/category-service";

export const createMockCategoryService = (): jest.Mocked<CategoryService> => ({
  getCategoriesByUser: jest.fn(),
  createCategory: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
});
