import { faker } from "@faker-js/faker";
import { fakeCategory } from "../__tests__/utils/factories";
import { createMockCategoryRepository } from "../__tests__/utils/mock-repositories";
import { CategoryType } from "../models/category";
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
});
