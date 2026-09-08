import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import {
  CategoryType,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
} from "../models/category";
import { ModelError } from "../models/model-error";
import { CategoryRepository } from "../ports/category-repository";
import { EntityScope } from "../types/entity-scope";
import {
  fakeCategory,
  fakeCreateCategoryInput,
} from "../utils/test-utils/models/category-fakes";
import { createMockCategoryRepository } from "../utils/test-utils/repositories/category-repository-mocks";
import { BusinessError } from "./business-error";
import { CategoryServiceImpl } from "./category-service";

describe("CategoryService", () => {
  let mockCategoryRepository: Mocked<CategoryRepository>;
  let service: CategoryServiceImpl;
  let userId: string;

  beforeEach(() => {
    mockCategoryRepository = createMockCategoryRepository();
    service = new CategoryServiceImpl(mockCategoryRepository);
    userId = faker.string.uuid();

    // Default: no existing categories for duplicate-name lookup
    mockCategoryRepository.findManyByUserId.mockResolvedValue([]);
  });

  describe("getCategoriesByUser", () => {
    // Happy path

    it("returns active categories when no type provided", async () => {
      // Arrange
      // Repository returns two categories
      const categories = [fakeCategory(), fakeCategory()];
      mockCategoryRepository.findManyByUserId.mockResolvedValue(categories);

      // Act
      const result = await service.getCategoriesByUser(userId, {
        scope: EntityScope.ACTIVE,
      });

      // Assert
      expect(result).toEqual(categories);
      expect(mockCategoryRepository.findManyByUserId).toHaveBeenCalledWith(
        userId,
        { type: undefined },
      );
    });

    it("returns active categories filtered by given type", async () => {
      // Arrange
      const type = CategoryType.INCOME;
      // Repository returns two income categories
      const categories = [fakeCategory(), fakeCategory()];
      mockCategoryRepository.findManyByUserId.mockResolvedValue(categories);

      // Act
      const result = await service.getCategoriesByUser(userId, {
        scope: EntityScope.ACTIVE,
        type,
      });

      // Assert
      expect(result).toEqual(categories);
      expect(mockCategoryRepository.findManyByUserId).toHaveBeenCalledWith(
        userId,
        { type },
      );
    });

    it("returns both active and archived categories when scope is all", async () => {
      // Arrange
      const categories = [
        fakeCategory({ isArchived: true }),
        fakeCategory({ isArchived: false }),
      ];
      mockCategoryRepository.findManyWithArchivedByUserId.mockResolvedValue(
        categories,
      );

      // Act
      const result = await service.getCategoriesByUser(userId, {
        scope: EntityScope.ALL,
      });

      // Assert
      expect(result).toEqual(categories);
      expect(
        mockCategoryRepository.findManyWithArchivedByUserId,
      ).toHaveBeenCalledWith(userId);
    });

    it("returns only archived categories when scope is archived", async () => {
      // Arrange
      const categories = [
        fakeCategory({ isArchived: true }),
        fakeCategory({ isArchived: false }),
      ];
      mockCategoryRepository.findManyWithArchivedByUserId.mockResolvedValue(
        categories,
      );

      // Act
      const result = await service.getCategoriesByUser(userId, {
        scope: EntityScope.ARCHIVED,
      });

      // Assert
      expect(result).toEqual([categories[0]]);
      expect(
        mockCategoryRepository.findManyWithArchivedByUserId,
      ).toHaveBeenCalledWith(userId);
    });

    it("filters by type when scope is all", async () => {
      // Arrange
      const matchingType = CategoryType.INCOME;
      const categories = [
        fakeCategory({ type: matchingType, isArchived: true }),
        fakeCategory({ type: CategoryType.EXPENSE, isArchived: false }),
      ];
      mockCategoryRepository.findManyWithArchivedByUserId.mockResolvedValue(
        categories,
      );

      // Act
      const result = await service.getCategoriesByUser(userId, {
        scope: EntityScope.ALL,
        type: matchingType,
      });

      // Assert
      expect(result).toEqual([categories[0]]);
    });
  });

  describe("createCategory", () => {
    // Happy path

    it("creates and returns new category", async () => {
      // Arrange
      const input = fakeCreateCategoryInput({ userId });

      // Act
      const result = await service.createCategory(input);

      // Assert
      expect(result).toMatchObject({
        userId,
        name: input.name,
        type: input.type,
        excludeFromReports: input.excludeFromReports,
        isArchived: false,
      });
      expect(mockCategoryRepository.create).toHaveBeenCalledTimes(1);
      expect(mockCategoryRepository.create).toHaveBeenCalledWith(result);
    });

    it("trims name before persisting", async () => {
      // Arrange
      const input = fakeCreateCategoryInput({ name: "  Groceries  " });

      // Act
      await service.createCategory(input);

      // Assert
      expect(mockCategoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Groceries" }),
      );
    });

    // Validation failures

    it("propagates ModelError without persisting when name is empty", async () => {
      // Arrange
      const input = fakeCreateCategoryInput({ name: "" });

      // Act
      const promise = service.createCategory(input);

      // Assert
      await expect(promise).rejects.toThrow(ModelError);
      await expect(promise).rejects.toMatchObject({
        message: `Category name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      });
      expect(mockCategoryRepository.create).not.toHaveBeenCalled();
    });

    it("propagates ModelError without persisting when name exceeds maximum length", async () => {
      // Arrange
      const input = fakeCreateCategoryInput({
        name: "a".repeat(NAME_MAX_LENGTH + 1),
      });

      // Act
      const promise = service.createCategory(input);

      // Assert
      await expect(promise).rejects.toThrow(ModelError);
      expect(mockCategoryRepository.create).not.toHaveBeenCalled();
    });

    it("throws when name matches existing category case-insensitively", async () => {
      // Arrange
      // Existing category uses same name in different casing
      mockCategoryRepository.findManyByUserId.mockResolvedValue([
        fakeCategory({ userId, name: "GROCERIES" }),
      ]);
      const input = fakeCreateCategoryInput({ userId, name: "groceries" });

      // Act
      const promise = service.createCategory(input);

      // Assert
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: 'Category "groceries" already exists',
      });
      expect(mockCategoryRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("updateCategory", () => {
    // Happy path

    it("returns updated category", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      const existingCategory = fakeCategory({
        id: categoryId,
        userId,
        name: "Original",
        type: CategoryType.EXPENSE,
      });

      mockCategoryRepository.findOneById.mockResolvedValue(existingCategory);
      mockCategoryRepository.update.mockImplementation(
        async (category) => category,
      );

      // Act
      const result = await service.updateCategory(categoryId, userId, {
        name: "New Name",
        type: CategoryType.INCOME,
      });

      // Assert
      expect(result).toMatchObject({
        id: categoryId,
        userId,
        name: "New Name",
        type: CategoryType.INCOME,
      });
      expect(mockCategoryRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: categoryId,
          name: "New Name",
          type: CategoryType.INCOME,
        }),
      );
    });

    it("trims name before persisting", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      const existingCategory = fakeCategory({ id: categoryId, userId });

      mockCategoryRepository.findOneById.mockResolvedValue(existingCategory);
      mockCategoryRepository.update.mockImplementation(
        async (category) => category,
      );

      // Act
      await service.updateCategory(categoryId, userId, {
        name: "  Groceries  ",
      });

      // Assert
      expect(mockCategoryRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Groceries" }),
      );
    });

    it("allows keeping same name", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      const currentCategory = fakeCategory({
        id: categoryId,
        userId,
        name: "Groceries",
      });

      mockCategoryRepository.findOneById.mockResolvedValue(currentCategory);
      mockCategoryRepository.update.mockImplementation(
        async (category) => category,
      );

      // Act
      const result = await service.updateCategory(categoryId, userId, {
        name: "Groceries",
      });

      // Assert
      expect(result.name).toBe("Groceries");
      expect(mockCategoryRepository.update).toHaveBeenCalled();
      // No duplicate-name lookup when the name does not change
      expect(mockCategoryRepository.findManyByUserId).not.toHaveBeenCalled();
    });

    // Validation failures

    it("throws when category is not found", async () => {
      // Arrange
      const categoryId = faker.string.uuid();

      mockCategoryRepository.findOneById.mockResolvedValue(null);

      // Act & Assert
      const promise = service.updateCategory(categoryId, userId, {
        name: "New Name",
      });

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Category not found",
      });
      expect(mockCategoryRepository.update).not.toHaveBeenCalled();
    });

    it("propagates ModelError without persisting when name is empty", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      const currentCategory = fakeCategory({ id: categoryId, userId });
      mockCategoryRepository.findOneById.mockResolvedValue(currentCategory);

      // Act & Assert
      await expect(
        service.updateCategory(categoryId, userId, { name: "" }),
      ).rejects.toThrow(ModelError);
      expect(mockCategoryRepository.update).not.toHaveBeenCalled();
    });

    it("propagates ModelError without persisting when updating archived category", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      const currentCategory = fakeCategory({
        id: categoryId,
        userId,
        isArchived: true,
      });
      mockCategoryRepository.findOneById.mockResolvedValue(currentCategory);

      // Act & Assert
      await expect(
        service.updateCategory(categoryId, userId, { name: "New Name" }),
      ).rejects.toThrow(ModelError);
      expect(mockCategoryRepository.update).not.toHaveBeenCalled();
    });

    it("throws when updated name already exists for another category", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      const currentCategory = fakeCategory({
        id: categoryId,
        userId,
        name: "Utilities",
      });
      const otherCategory = fakeCategory({ userId, name: "Groceries" });

      mockCategoryRepository.findOneById.mockResolvedValue(currentCategory);
      // Another category already has the name "Groceries"
      mockCategoryRepository.findManyByUserId.mockResolvedValue([
        currentCategory,
        otherCategory,
      ]);

      // Act & Assert
      const promise = service.updateCategory(categoryId, userId, {
        name: "Groceries",
      });

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: 'Category "Groceries" already exists',
      });
      expect(mockCategoryRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteCategory", () => {
    // Happy path

    it("returns archived category", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      const currentCategory = fakeCategory({
        id: categoryId,
        userId,
        isArchived: false,
      });

      mockCategoryRepository.findOneById.mockResolvedValue(currentCategory);
      mockCategoryRepository.update.mockImplementation(
        async (category) => category,
      );

      // Act
      const result = await service.deleteCategory(categoryId, userId);

      // Assert
      expect(result.isArchived).toBe(true);
      expect(mockCategoryRepository.update).toHaveBeenCalledWith(result);
    });

    // Validation failures

    it("throws when category is not found", async () => {
      // Arrange
      const categoryId = faker.string.uuid();

      mockCategoryRepository.findOneById.mockResolvedValue(null);

      // Act & Assert
      const promise = service.deleteCategory(categoryId, userId);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Category not found",
      });
      expect(mockCategoryRepository.update).not.toHaveBeenCalled();
    });
  });
});
