import { faker } from "@faker-js/faker";
import { jest } from "@jest/globals";
import { CategoryType } from "../../../models/category";
import {
  CategoryRepository,
  CreateCategoryInput,
} from "../../../services/ports/category-repository";

/**
 * Mock category repository for testing
 */
export const createMockCategoryRepository =
  (): jest.Mocked<CategoryRepository> => ({
    findManyByUserId: jest.fn(),
    findManyWithArchivedByUserId: jest.fn(),
    findOneById: jest.fn(),
    findManyWithArchivedByIds: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
  });

export const fakeCreateCategoryInput = (
  overrides: Partial<CreateCategoryInput> = {},
): CreateCategoryInput => {
  return {
    userId: faker.string.uuid(),
    name: `${faker.commerce.department()}-${faker.string.uuid()}`, // Ensure uniqueness
    type: CategoryType.EXPENSE,
    excludeFromReports: false,
    ...overrides,
  };
};
