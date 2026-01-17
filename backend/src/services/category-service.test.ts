import { faker } from "@faker-js/faker";
import {
  fakeCategory,
  fakeCreateCategoryInput,
} from "../__tests__/utils/factories";
import { createMockCategoryRepository } from "../__tests__/utils/mock-repositories";
import { CategoryType } from "../models/category";
import { NAME_MAX_LENGTH, NAME_MIN_LENGTH } from "../types/validation";
import { BusinessError, BusinessErrorCodes } from "./business-error";
import { CategoryService } from "./category-service";

describe("CategoryService", () => {
  let service: CategoryService;
  let userId: string;
  let mockCategoryRepository: ReturnType<typeof createMockCategoryRepository>;

  beforeEach(() => {
    mockCategoryRepository = createMockCategoryRepository();
    service = new CategoryService(mockCategoryRepository);
    userId = faker.string.uuid();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe("getCategoriesByUser", () => {
    it("should call findActiveByUserId when no type provided", async () => {
      // Arrange
      const mockCategories = [fakeCategory(), fakeCategory()];
      mockCategoryRepository.findActiveByUserId.mockResolvedValue(
        mockCategories,
      );

      // Act
      const result = await service.getCategoriesByUser(userId);

      // Assert
      expect(mockCategoryRepository.findActiveByUserId).toHaveBeenCalledWith(
        userId,
      );
      expect(mockCategoryRepository.findActiveByUserId).toHaveBeenCalledTimes(
        1,
      );
      expect(
        mockCategoryRepository.findActiveByUserIdAndType,
      ).not.toHaveBeenCalled();
      expect(result).toEqual(mockCategories);
    });

    it("should call findActiveByUserIdAndType when type provided", async () => {
      // Arrange
      const type = CategoryType.INCOME;
      const mockCategories = [fakeCategory(), fakeCategory()];
      mockCategoryRepository.findActiveByUserIdAndType.mockResolvedValue(
        mockCategories,
      );

      // Act
      const result = await service.getCategoriesByUser(userId, type);

      // Assert
      expect(
        mockCategoryRepository.findActiveByUserIdAndType,
      ).toHaveBeenCalledWith(userId, type);
      expect(
        mockCategoryRepository.findActiveByUserIdAndType,
      ).toHaveBeenCalledTimes(1);
      expect(mockCategoryRepository.findActiveByUserId).not.toHaveBeenCalled();
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
        code: BusinessErrorCodes.INVALID_PARAMETERS,
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
        code: BusinessErrorCodes.INVALID_PARAMETERS,
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
        code: BusinessErrorCodes.INVALID_PARAMETERS,
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
        code: BusinessErrorCodes.INVALID_PARAMETERS,
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
        code: BusinessErrorCodes.INVALID_PARAMETERS,
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
        code: BusinessErrorCodes.INVALID_PARAMETERS,
      });
      expect(mockCategoryRepository.update).not.toHaveBeenCalled();
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
