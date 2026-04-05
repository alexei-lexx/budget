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

