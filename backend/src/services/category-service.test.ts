import { faker } from "@faker-js/faker";
import { CategoryType } from "../models/category";
import { NAME_MAX_LENGTH, NAME_MIN_LENGTH } from "../types/validation";
import {
  fakeCategory,
  fakeCreateCategoryInput,
} from "../utils/test-utils/factories";
import { createMockCategoryRepository } from "../utils/test-utils/mock-repositories";
import { BusinessError } from "./business-error";
import { CategoryService } from "./category-service";

describe("CategoryService", () => {
  let service: CategoryService;
  let userId: string;
  let mockCategoryRepository: ReturnType<typeof createMockCategoryRepository>;

  beforeEach(() => {
    mockCategoryRepository = createMockCategoryRepository();
    service = new CategoryService(mockCategoryRepository);
    userId = faker.string.uuid();

    // Default mocks for duplicate name checking (can be overridden in specific tests)
    mockCategoryRepository.findManyByUserId.mockResolvedValue([]);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe("getCategoriesByUser", () => {
    it("should call findManyByUserId without type filter when no type provided", async () => {
      // Arrange
      const mockCategories = [fakeCategory(), fakeCategory()];
      mockCategoryRepository.findManyByUserId.mockResolvedValue(mockCategories);

      // Act
      const result = await service.getCategoriesByUser(userId);

      // Assert
      expect(mockCategoryRepository.findManyByUserId).toHaveBeenCalledWith(
        userId,
        { type: undefined },
      );
      expect(mockCategoryRepository.findManyByUserId).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockCategories);
    });

    it("should call findManyByUserId with type filter when type provided", async () => {
      // Arrange
      const type = CategoryType.INCOME;
      const mockCategories = [fakeCategory(), fakeCategory()];
      mockCategoryRepository.findManyByUserId.mockResolvedValue(mockCategories);

      // Act
      const result = await service.getCategoriesByUser(userId, type);

      // Assert
      expect(mockCategoryRepository.findManyByUserId).toHaveBeenCalledWith(
        userId,
        { type },
      );
      expect(mockCategoryRepository.findManyByUserId).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockCategories);
    });
  });

  describe("createCategory", () => {
    it("should create a new category", async () => {
      // Arrange
      const input = fakeCreateCategoryInput();
      const createdCategory = fakeCategory();
      mockCategoryRepository.create.mockResolvedValue(createdCategory);

      // Act
      const result = await service.createCategory(input);

      // Assert
      expect(result).toEqual(createdCategory);
      expect(mockCategoryRepository.create).toHaveBeenCalledWith(input);
    });

    it("should trim name", async () => {
      // Arrange
      const input = fakeCreateCategoryInput({ name: "  Groceries  " });

      // Act
      await service.createCategory(input);

      // Assert
      expect(mockCategoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Groceries", // Trimmed
        }),
      );
    });

    it("should throw error when name is empty string", async () => {
      // Arrange
      const input = fakeCreateCategoryInput({ name: "" });

      // Act & Assert
      const promise = service.createCategory(input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Category name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      });
      expect(mockCategoryRepository.create).not.toHaveBeenCalled();
    });

    it("should throw error when name is only whitespace", async () => {
      // Arrange
      const input = fakeCreateCategoryInput({ name: "   " });

      // Act & Assert
      const promise = service.createCategory(input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Category name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      });
      expect(mockCategoryRepository.create).not.toHaveBeenCalled();
    });

    it("should throw error when name exceeds maximum length", async () => {
      // Arrange
      const input = fakeCreateCategoryInput({
        name: "a".repeat(NAME_MAX_LENGTH + 1),
      });

      // Act & Assert
      const promise = service.createCategory(input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Category name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      });
      expect(mockCategoryRepository.create).not.toHaveBeenCalled();
    });

    it("should throw error when category name already exists", async () => {
      // Arrange
      mockCategoryRepository.findManyByUserId.mockResolvedValue([
        fakeCategory({
          userId,
          name: "GROCERIES",
        }),
      ]);
      const input = fakeCreateCategoryInput({
        userId,
        name: "groceries", // Different casing
      });

      // Act & Assert
      const promise = service.createCategory(input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: 'Category "groceries" already exists',
      });
      expect(mockCategoryRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("updateCategory", () => {
    it("should update a category", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      const input = { name: "Updated Category Name" };
      const updatedCategory = fakeCategory();
      mockCategoryRepository.update.mockResolvedValue(updatedCategory);

      // Act
      const result = await service.updateCategory(categoryId, userId, input);

      // Assert
      expect(result).toEqual(updatedCategory);
      expect(mockCategoryRepository.update).toHaveBeenCalledWith(
        categoryId,
        userId,
        input,
      );
    });

    it("should trim name", async () => {
      // Arrange
      const categoryId = faker.string.uuid();

      const input = { name: "  Groceries  " };

      // Act
      await service.updateCategory(categoryId, userId, input);

      // Assert
      expect(mockCategoryRepository.update).toHaveBeenCalledWith(
        categoryId,
        userId,
        { name: "Groceries" }, // Trimmed
      );
    });

    it("should throw error when name is empty string", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      const input = { name: "" };

      // Act & Assert
      const promise = service.updateCategory(categoryId, userId, input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Category name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      });
      expect(mockCategoryRepository.update).not.toHaveBeenCalled();
    });

    it("should throw error when name is only whitespace", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      const input = { name: "   " };

      // Act & Assert
      const promise = service.updateCategory(categoryId, userId, input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Category name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      });
      expect(mockCategoryRepository.update).not.toHaveBeenCalled();
    });

    it("should throw error when name exceeds maximum length", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      const input = { name: "a".repeat(NAME_MAX_LENGTH + 1) };

      // Act & Assert
      const promise = service.updateCategory(categoryId, userId, input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Category name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      });
      expect(mockCategoryRepository.update).not.toHaveBeenCalled();
    });

    it("should throw error when updated name already exists", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      const currentCategory = fakeCategory({
        id: categoryId,
        userId,
      });
      const anotherExistingCategory = fakeCategory({
        userId,
        name: "Groceries",
      });
      const input = { name: "Groceries" };

      mockCategoryRepository.findManyByUserId.mockResolvedValue([
        currentCategory,
        anotherExistingCategory,
      ]);

      // Act & Assert
      const promise = service.updateCategory(categoryId, userId, input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: 'Category "Groceries" already exists',
      });
      expect(mockCategoryRepository.update).not.toHaveBeenCalled();
    });

    it("should allow keeping same name when updating", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      const currentCategory = fakeCategory({
        id: categoryId,
        userId,
        name: "Groceries",
      });
      const input = { name: "Groceries" }; // Same name

      mockCategoryRepository.findManyByUserId.mockResolvedValue([
        currentCategory,
        fakeCategory({ userId }),
      ]);

      // Act
      await service.updateCategory(categoryId, userId, input);

      // Assert
      expect(mockCategoryRepository.update).toHaveBeenCalledWith(
        categoryId,
        userId,
        input,
      );
    });
  });

  describe("deleteCategory", () => {
    it("should archive a category", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      const archivedCategory = fakeCategory();
      mockCategoryRepository.archive.mockResolvedValue(archivedCategory);

      // Act
      const result = await service.deleteCategory(categoryId, userId);

      // Assert
      expect(result).toEqual(archivedCategory);
      expect(mockCategoryRepository.archive).toHaveBeenCalledWith(
        categoryId,
        userId,
      );
    });
  });
});
