import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { CategoryType } from "../models/category";
import { CategoryRepository } from "../ports/category-repository";
import { fakeCategory } from "../utils/test-utils/models/category-fakes";
import { fakeCreateCategoryInput } from "../utils/test-utils/repositories/category-repository-fakes";
import { createMockCategoryRepository } from "../utils/test-utils/repositories/category-repository-mocks";
import { BusinessError } from "./business-error";
import {
  CategoryServiceImpl,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
} from "./category-service";

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

    it("returns categories when no type provided", async () => {
      // Arrange
      // Repository returns two categories
      const categories = [fakeCategory(), fakeCategory()];
      mockCategoryRepository.findManyByUserId.mockResolvedValue(categories);

      // Act
      const result = await service.getCategoriesByUser(userId);

      // Assert
      expect(result).toEqual(categories);
      expect(mockCategoryRepository.findManyByUserId).toHaveBeenCalledWith(
        userId,
        { type: undefined },
      );
    });

    it("returns categories filtered by given type", async () => {
      // Arrange
      const type = CategoryType.INCOME;
      // Repository returns two income categories
      const categories = [fakeCategory(), fakeCategory()];
      mockCategoryRepository.findManyByUserId.mockResolvedValue(categories);

      // Act
      const result = await service.getCategoriesByUser(userId, type);

      // Assert
      expect(result).toEqual(categories);
      expect(mockCategoryRepository.findManyByUserId).toHaveBeenCalledWith(
        userId,
        { type },
      );
    });
  });

  describe("createCategory", () => {
    // Happy path

    it("creates new category", async () => {
      // Arrange
      const input = fakeCreateCategoryInput();
      // Persists and returns created category
      const createdCategory = fakeCategory();
      mockCategoryRepository.create.mockResolvedValue(createdCategory);

      // Act
      const result = await service.createCategory(input);

      // Assert
      expect(result).toEqual(createdCategory);
      expect(mockCategoryRepository.create).toHaveBeenCalledWith(input);
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

    it("throws when name is empty", async () => {
      // Arrange
      const input = fakeCreateCategoryInput({ name: "" });

      // Act
      const promise = service.createCategory(input);

      // Assert
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Category name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      });
      expect(mockCategoryRepository.create).not.toHaveBeenCalled();
    });

    it("throws when name is only whitespace", async () => {
      // Arrange
      const input = fakeCreateCategoryInput({ name: "   " });

      // Act
      const promise = service.createCategory(input);

      // Assert
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Category name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      });
      expect(mockCategoryRepository.create).not.toHaveBeenCalled();
    });

    it("throws when name exceeds maximum length", async () => {
      // Arrange
      const input = fakeCreateCategoryInput({
        name: "a".repeat(NAME_MAX_LENGTH + 1),
      });

      // Act
      const promise = service.createCategory(input);

      // Assert
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Category name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      });
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

    it("updates category", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      const input = { name: "Updated Category Name" };
      // Persists and returns updated category
      const updatedCategory = fakeCategory();
      mockCategoryRepository.update.mockResolvedValue(updatedCategory);

      // Act
      const result = await service.updateCategory(categoryId, userId, input);

      // Assert
      expect(result).toEqual(updatedCategory);
      expect(mockCategoryRepository.update).toHaveBeenCalledWith(
        { id: categoryId, userId },
        input,
      );
    });

    it("trims name before persisting", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      const input = { name: "  Groceries  " };

      // Act
      await service.updateCategory(categoryId, userId, input);

      // Assert
      expect(mockCategoryRepository.update).toHaveBeenCalledWith(
        { id: categoryId, userId },
        { name: "Groceries" },
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
      const input = { name: "Groceries" };
      // Existing categories include target itself and one unrelated
      mockCategoryRepository.findManyByUserId.mockResolvedValue([
        currentCategory,
        fakeCategory({ userId }),
      ]);

      // Act
      await service.updateCategory(categoryId, userId, input);

      // Assert
      expect(mockCategoryRepository.update).toHaveBeenCalledWith(
        { id: categoryId, userId },
        input,
      );
    });

    // Validation failures

    it("throws when name is empty", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      const input = { name: "" };

      // Act
      const promise = service.updateCategory(categoryId, userId, input);

      // Assert
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Category name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      });
      expect(mockCategoryRepository.update).not.toHaveBeenCalled();
    });

    it("throws when name is only whitespace", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      const input = { name: "   " };

      // Act
      const promise = service.updateCategory(categoryId, userId, input);

      // Assert
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Category name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      });
      expect(mockCategoryRepository.update).not.toHaveBeenCalled();
    });

    it("throws when name exceeds maximum length", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      const input = { name: "a".repeat(NAME_MAX_LENGTH + 1) };

      // Act
      const promise = service.updateCategory(categoryId, userId, input);

      // Assert
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Category name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      });
      expect(mockCategoryRepository.update).not.toHaveBeenCalled();
    });

    it("throws when updated name already exists", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      const currentCategory = fakeCategory({ id: categoryId, userId });
      const otherCategory = fakeCategory({ userId, name: "Groceries" });
      const input = { name: "Groceries" };
      // Another category already uses target name
      mockCategoryRepository.findManyByUserId.mockResolvedValue([
        currentCategory,
        otherCategory,
      ]);

      // Act
      const promise = service.updateCategory(categoryId, userId, input);

      // Assert
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: 'Category "Groceries" already exists',
      });
      expect(mockCategoryRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteCategory", () => {
    // Happy path

    it("archives category", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      // Persists and returns archived category
      const archivedCategory = fakeCategory();
      mockCategoryRepository.archive.mockResolvedValue(archivedCategory);

      // Act
      const result = await service.deleteCategory(categoryId, userId);

      // Assert
      expect(result).toEqual(archivedCategory);
      expect(mockCategoryRepository.archive).toHaveBeenCalledWith({
        id: categoryId,
        userId,
      });
    });
  });
});
