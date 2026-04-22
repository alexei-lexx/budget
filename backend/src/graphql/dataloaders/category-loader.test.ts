import { describe, expect, it } from "@jest/globals";
import DataLoader from "dataloader";
import { fakeCategory } from "../../utils/test-utils/models/category-fakes";
import { createMockCategoryRepository } from "../../utils/test-utils/repositories/category-repository-mocks";
import { batchLoadCategories, createCategoryLoader } from "./category-loader";

describe("Category Batch Loader", () => {
  describe("batchLoadCategories", () => {
    it("batches load 5 valid category IDs and returns correct data", async () => {
      const mockRepository = createMockCategoryRepository();

      // Create 5 fake categories
      const category1 = fakeCategory({
        id: "cat-1",
        name: "Groceries",
        isArchived: false,
      });
      const category2 = fakeCategory({
        id: "cat-2",
        name: "Transportation",
        isArchived: true,
      });
      const category3 = fakeCategory({
        id: "cat-3",
        name: "Entertainment",
        isArchived: false,
      });
      const category4 = fakeCategory({
        id: "cat-4",
        name: "Utilities",
        isArchived: true,
      });
      const category5 = fakeCategory({
        id: "cat-5",
        name: "Healthcare",
        isArchived: false,
      });

      // Mock repository to return categories
      mockRepository.findManyWithArchivedByIds.mockResolvedValue([
        category3,
        category4,
        category1,
        category2,
        category5,
      ]);

      const result = await batchLoadCategories(
        ["cat-1", "cat-2", "cat-3", "cat-4", "cat-5"],
        mockRepository,
        "test-user-id",
      );

      expect(result).toHaveLength(5);

      expect(result[0]).toEqual({
        id: "cat-1",
        name: "Groceries",
        isArchived: false,
      });

      expect(result[1]).toEqual({
        id: "cat-2",
        name: "Transportation",
        isArchived: true,
      });

      expect(result[2]).toEqual({
        id: "cat-3",
        name: "Entertainment",
        isArchived: false,
      });

      expect(result[3]).toEqual({
        id: "cat-4",
        name: "Utilities",
        isArchived: true,
      });

      expect(result[4]).toEqual({
        id: "cat-5",
        name: "Healthcare",
        isArchived: false,
      });
    });

    it("handles mix of valid and non-existent categories with stub data", async () => {
      const mockRepository = createMockCategoryRepository();

      const validCategory = fakeCategory({ id: "cat-valid" });

      mockRepository.findManyWithArchivedByIds.mockResolvedValue([
        validCategory,
      ]);

      const result = await batchLoadCategories(
        ["cat-valid", "cat-missing"],
        mockRepository,
        "test-user-id",
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "cat-valid",
        name: validCategory.name,
        isArchived: validCategory.isArchived,
      });
      // Missing category should return stub data
      expect(result[1]).toEqual({
        id: "cat-missing",
        name: "Unknown",
        isArchived: false,
      });
    });

    it("handles duplicate IDs by deduplicating and preserving order", async () => {
      const mockRepository = createMockCategoryRepository();

      const category = fakeCategory({ id: "cat-1" });

      mockRepository.findManyWithArchivedByIds.mockResolvedValue([category]);

      const result = await batchLoadCategories(
        ["cat-1", "cat-1", "cat-1"],
        mockRepository,
        "test-user-id",
      );

      // Should still return 3 items (same count as input), all with same category data
      expect(result).toHaveLength(3);
      result.forEach((cat) => {
        expect(cat).toEqual({
          id: "cat-1",
          name: category.name,
          isArchived: category.isArchived,
        });
      });
    });

    it("returns empty array for empty input", async () => {
      const mockRepository = createMockCategoryRepository();

      const result = await batchLoadCategories(
        [],
        mockRepository,
        "test-user-id",
      );

      expect(result).toEqual([]);
      expect(mockRepository.findManyWithArchivedByIds).not.toHaveBeenCalled();
    });
  });

  describe("createCategoryLoader", () => {
    it("creates DataLoader instance", () => {
      const mockRepository = createMockCategoryRepository();
      const loader = createCategoryLoader(
        mockRepository,
        async () => "test-user-id",
      );

      expect(loader).toBeInstanceOf(DataLoader);
    });

    it("batches load through DataLoader with valid ID", async () => {
      const mockRepository = createMockCategoryRepository();
      const category = fakeCategory({ id: "cat-1" });

      mockRepository.findManyWithArchivedByIds.mockResolvedValue([category]);

      const loader = createCategoryLoader(
        mockRepository,
        async () => "test-user-id",
      );

      const result = await loader.load("cat-1");

      expect(result).toEqual({
        id: "cat-1",
        name: category.name,
        isArchived: category.isArchived,
      });
    });
  });
});
