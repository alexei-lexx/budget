import { type Mocked, vi } from "vitest";
import { CategoryRepository } from "../../../ports/category-repository";

/**
 * Mock category repository for testing
 */
export const createMockCategoryRepository = (): Mocked<CategoryRepository> => ({
  findManyByUserId: vi.fn(),
  findManyWithArchivedByUserId: vi.fn(),
  findOneById: vi.fn(),
  findManyWithArchivedByIds: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  archive: vi.fn(),
});
