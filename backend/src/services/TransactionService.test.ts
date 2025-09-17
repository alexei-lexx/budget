import {
  DEFAULT_TRANSACTION_PATTERNS_LIMIT,
  MAX_TRANSACTION_PATTERNS_LIMIT,
  MIN_TRANSACTION_PATTERNS_LIMIT,
  DESCRIPTION_SUGGESTIONS_SAMPLE_SIZE,
  TransactionService,
} from "./TransactionService";
import { MIN_SEARCH_TEXT_LENGTH } from "../types/validation";
import { TransactionPatternType, TransactionType } from "../models/Transaction";
import { CategoryType } from "../models/Category";
import { BusinessError, BusinessErrorCodes } from "./BusinessError";
import { faker } from "@faker-js/faker";
import {
  createMockTransactionRepository,
  createMockAccountRepository,
  createMockCategoryRepository,
} from "../__tests__/utils/mockRepositories";
import {
  fakeAccount,
  fakeCategory,
  fakeTransactionPattern,
  fakeTransaction,
} from "../__tests__/utils/factories";

describe("TransactionService", () => {
  let service: TransactionService;
  let userId: string;
  let mockTransactionRepository: ReturnType<
    typeof createMockTransactionRepository
  >;
  let mockAccountRepository: ReturnType<typeof createMockAccountRepository>;
  let mockCategoryRepository: ReturnType<typeof createMockCategoryRepository>;

  beforeEach(() => {
    mockTransactionRepository = createMockTransactionRepository();
    mockAccountRepository = createMockAccountRepository();
    mockCategoryRepository = createMockCategoryRepository();

    service = new TransactionService(
      mockAccountRepository,
      mockCategoryRepository,
      mockTransactionRepository,
    );
    userId = faker.string.uuid();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe("getTransactionPatterns", () => {
    it("should return enriched patterns for valid account and category combinations", async () => {
      // Arrange
      const patterns = [
        fakeTransactionPattern({
          accountId: "account-1",
          categoryId: "category-1",
        }),
        fakeTransactionPattern({
          accountId: "account-2",
          categoryId: "category-2",
        }),
      ];

      const account1 = fakeAccount({
        id: "account-1",
        userId,
        name: "Checking Account",
      });

      const account2 = fakeAccount({
        id: "account-2",
        userId,
        name: "Savings Account",
      });

      const category1 = fakeCategory({
        id: "category-1",
        userId,
        name: "Salary",
        type: CategoryType.INCOME,
      });

      const category2 = fakeCategory({
        id: "category-2",
        userId,
        name: "Freelance",
        type: CategoryType.INCOME,
      });

      mockTransactionRepository.detectPatterns.mockResolvedValue(patterns);
      mockAccountRepository.findActiveById
        .mockResolvedValueOnce(account1)
        .mockResolvedValueOnce(account2);
      mockCategoryRepository.findActiveById
        .mockResolvedValueOnce(category1)
        .mockResolvedValueOnce(category2);

      // Act
      const result = await service.getTransactionPatterns(
        userId,
        TransactionPatternType.INCOME,
        3,
        100,
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        accountId: "account-1",
        categoryId: "category-1",
        accountName: "Checking Account",
        categoryName: "Salary",
      });
      expect(result[1]).toEqual({
        accountId: "account-2",
        categoryId: "category-2",
        accountName: "Savings Account",
        categoryName: "Freelance",
      });
    });

    it("should filter out patterns with deleted accounts", async () => {
      // Arrange
      const patterns = [
        fakeTransactionPattern({
          accountId: "account-1",
          categoryId: "category-1",
        }),
        fakeTransactionPattern({
          accountId: "account-deleted",
          categoryId: "category-2",
        }),
      ];

      const account1 = fakeAccount({
        id: "account-1",
        userId,
        name: "Checking Account",
      });

      const category1 = fakeCategory({
        id: "category-1",
        userId,
        name: "Salary",
        type: CategoryType.INCOME,
      });

      mockTransactionRepository.detectPatterns.mockResolvedValue(patterns);
      mockAccountRepository.findActiveById
        .mockResolvedValueOnce(account1)
        .mockResolvedValueOnce(null); // Deleted account
      mockCategoryRepository.findActiveById.mockResolvedValueOnce(category1);

      // Act
      const result = await service.getTransactionPatterns(
        userId,
        TransactionPatternType.INCOME,
        3,
        100,
      );

      // Assert - Only first pattern should be returned
      expect(result).toHaveLength(1);
      expect(result[0].accountId).toBe("account-1");
    });

    it("should filter out patterns with deleted categories", async () => {
      // Arrange
      const patterns = [
        fakeTransactionPattern({
          accountId: "account-1",
          categoryId: "category-1",
        }),
        fakeTransactionPattern({
          accountId: "account-2",
          categoryId: "category-deleted",
        }),
      ];

      const account1 = fakeAccount({
        id: "account-1",
        userId,
        name: "Checking Account",
      });

      const account2 = fakeAccount({
        id: "account-2",
        userId,
        name: "Savings Account",
      });

      const category1 = fakeCategory({
        id: "category-1",
        userId,
        name: "Salary",
        type: CategoryType.INCOME,
      });

      mockTransactionRepository.detectPatterns.mockResolvedValue(patterns);
      mockAccountRepository.findActiveById
        .mockResolvedValueOnce(account1)
        .mockResolvedValueOnce(account2);
      mockCategoryRepository.findActiveById
        .mockResolvedValueOnce(category1)
        .mockResolvedValueOnce(null); // Deleted category

      // Act
      const result = await service.getTransactionPatterns(
        userId,
        TransactionPatternType.INCOME,
        3,
        100,
      );

      // Assert - Only first pattern should be returned
      expect(result).toHaveLength(1);
      expect(result[0].categoryId).toBe("category-1");
    });

    it("should filter out patterns with mismatched category types", async () => {
      // Arrange
      const patterns = [
        fakeTransactionPattern({
          accountId: "account-1",
          categoryId: "category-income",
        }),
        fakeTransactionPattern({
          accountId: "account-2",
          categoryId: "category-expense",
        }),
      ];

      const account1 = fakeAccount({
        id: "account-1",
        userId,
        name: "Checking Account",
      });

      const account2 = fakeAccount({
        id: "account-2",
        userId,
        name: "Credit Card",
      });

      const incomeCategory = fakeCategory({
        id: "category-income",
        userId,
        name: "Salary",
        type: CategoryType.INCOME,
      });

      const expenseCategory = fakeCategory({
        id: "category-expense",
        userId,
        name: "Food",
        type: CategoryType.EXPENSE, // Wrong type for INCOME transaction
      });

      mockTransactionRepository.detectPatterns.mockResolvedValue(patterns);
      mockAccountRepository.findActiveById
        .mockResolvedValueOnce(account1)
        .mockResolvedValueOnce(account2);
      mockCategoryRepository.findActiveById
        .mockResolvedValueOnce(incomeCategory)
        .mockResolvedValueOnce(expenseCategory);

      // Act
      const result = await service.getTransactionPatterns(
        userId,
        TransactionPatternType.INCOME,
        3,
        100,
      );

      // Assert - Only income category pattern should be returned
      expect(result).toHaveLength(1);
      expect(result[0].categoryId).toBe("category-income");
    });

    it("should return empty array when all patterns are invalid", async () => {
      // Arrange
      const patterns = [
        fakeTransactionPattern({
          accountId: "account-deleted",
          categoryId: "category-1",
        }),
        fakeTransactionPattern({
          accountId: "account-2",
          categoryId: "category-deleted",
        }),
      ];

      mockTransactionRepository.detectPatterns.mockResolvedValue(patterns);
      mockAccountRepository.findActiveById.mockResolvedValue(null); // All accounts deleted
      mockCategoryRepository.findActiveById.mockResolvedValue(null); // All categories deleted

      // Act
      const result = await service.getTransactionPatterns(
        userId,
        TransactionPatternType.INCOME,
        3,
        100,
      );

      // Assert
      expect(result).toEqual([]);
    });

    it("should return empty array for new users with no transaction history", async () => {
      // Arrange
      mockTransactionRepository.detectPatterns.mockResolvedValue([]);

      // Act
      const result = await service.getTransactionPatterns(
        userId,
        TransactionPatternType.INCOME,
        3,
        100,
      );

      // Assert
      expect(result).toEqual([]);
      expect(mockAccountRepository.findActiveById).not.toHaveBeenCalled();
      expect(mockCategoryRepository.findActiveById).not.toHaveBeenCalled();
    });

    it("should pass correct parameters to repository", async () => {
      // Arrange
      mockTransactionRepository.detectPatterns.mockResolvedValue([]);

      // Act
      await service.getTransactionPatterns(
        userId,
        TransactionPatternType.EXPENSE,
        5,
        200,
      );

      // Assert
      expect(mockTransactionRepository.detectPatterns).toHaveBeenCalledWith(
        userId,
        TransactionType.EXPENSE,
        5,
        200,
      );
    });

    describe("limit parameter validation", () => {
      beforeEach(() => {
        mockTransactionRepository.detectPatterns.mockResolvedValue([]);
      });

      it("should use default limit when no limit is provided", async () => {
        // Act
        await service.getTransactionPatterns(
          userId,
          TransactionPatternType.INCOME,
        );

        // Assert
        expect(mockTransactionRepository.detectPatterns).toHaveBeenCalledWith(
          userId,
          TransactionPatternType.INCOME,
          DEFAULT_TRANSACTION_PATTERNS_LIMIT,
          100, // default sampleSize
        );
      });

      it("should use default limit when limit is null", async () => {
        // Act
        await service.getTransactionPatterns(
          userId,
          TransactionPatternType.INCOME,
          null,
        );

        // Assert
        expect(mockTransactionRepository.detectPatterns).toHaveBeenCalledWith(
          userId,
          TransactionPatternType.INCOME,
          DEFAULT_TRANSACTION_PATTERNS_LIMIT,
          100,
        );
      });

      it("should use default limit when limit is undefined", async () => {
        // Act
        await service.getTransactionPatterns(
          userId,
          TransactionPatternType.INCOME,
          undefined,
        );

        // Assert
        expect(mockTransactionRepository.detectPatterns).toHaveBeenCalledWith(
          userId,
          TransactionPatternType.INCOME,
          DEFAULT_TRANSACTION_PATTERNS_LIMIT,
          100,
        );
      });

      it("should accept valid limit values between min and max", async () => {
        const validLimits = [
          MIN_TRANSACTION_PATTERNS_LIMIT,
          MIN_TRANSACTION_PATTERNS_LIMIT + 1,
          MAX_TRANSACTION_PATTERNS_LIMIT - 1,
          MAX_TRANSACTION_PATTERNS_LIMIT,
        ];

        for (const limit of validLimits) {
          // Act
          await service.getTransactionPatterns(
            userId,
            TransactionPatternType.INCOME,
            limit,
          );

          // Assert
          expect(mockTransactionRepository.detectPatterns).toHaveBeenCalledWith(
            userId,
            TransactionPatternType.INCOME,
            limit,
            100,
          );
        }
      });

      it("should fall back to default limit for invalid values", async () => {
        const invalidLimits = [
          MIN_TRANSACTION_PATTERNS_LIMIT - 1,
          MAX_TRANSACTION_PATTERNS_LIMIT + 1,
        ];

        for (const limit of invalidLimits) {
          // Act
          await service.getTransactionPatterns(
            userId,
            TransactionPatternType.INCOME,
            limit,
          );

          // Assert
          expect(mockTransactionRepository.detectPatterns).toHaveBeenCalledWith(
            userId,
            TransactionPatternType.INCOME,
            DEFAULT_TRANSACTION_PATTERNS_LIMIT,
            100,
          );
        }
      });

      it("should fall back to default limit for non-integer values", async () => {
        const nonIntegerLimits = [1.5, 3.7, 5.9, 2.1];

        for (const limit of nonIntegerLimits) {
          // Act
          await service.getTransactionPatterns(
            userId,
            TransactionPatternType.INCOME,
            limit,
          );

          // Assert
          expect(mockTransactionRepository.detectPatterns).toHaveBeenCalledWith(
            userId,
            TransactionPatternType.INCOME,
            DEFAULT_TRANSACTION_PATTERNS_LIMIT,
            100,
          );
        }
      });
    });
  });

  describe("getDescriptionSuggestions", () => {
    it("should return suggestions ordered by frequency", async () => {
      // Arrange
      const searchText = "Gr";
      const transactions = [
        fakeTransaction({ description: "Grocery store" }),
        fakeTransaction({ description: "Grocery store" }),
        fakeTransaction({ description: "Grocery shopping" }),
        fakeTransaction({ description: "Great restaurant" }),
      ];

      mockTransactionRepository.findActiveByDescription.mockResolvedValue(
        transactions,
      );

      // Act
      const result = await service.getDescriptionSuggestions(
        userId,
        searchText,
        5,
      );

      // Assert
      expect(result).toHaveLength(3); // 3 unique descriptions
      expect(result[0]).toBe("Grocery store"); // Should be first (highest frequency)
    });

    it("should respect the limit parameter", async () => {
      // Arrange
      const searchText = "te";
      const transactions = [
        fakeTransaction({ description: "Test 1" }),
        fakeTransaction({ description: "Test 2" }),
        fakeTransaction({ description: "Test 3" }),
        fakeTransaction({ description: "Test 4" }),
        fakeTransaction({ description: "Test 5" }),
      ];

      mockTransactionRepository.findActiveByDescription.mockResolvedValue(
        transactions,
      );

      // Act
      const result = await service.getDescriptionSuggestions(
        userId,
        searchText,
        3,
      );

      // Assert
      expect(result).toHaveLength(3); // Limited to 3 results
    });

    it("should return empty array when no matches found", async () => {
      // Arrange
      const searchText = "xyz";
      mockTransactionRepository.findActiveByDescription.mockResolvedValue([]);

      // Act
      const result = await service.getDescriptionSuggestions(
        userId,
        searchText,
        5,
      );

      // Assert
      expect(result).toEqual([]);
    });

    it("should call repository with correct parameters", async () => {
      // Arrange
      const searchText = "test";
      mockTransactionRepository.findActiveByDescription.mockResolvedValue([]);

      // Act
      await service.getDescriptionSuggestions(userId, searchText, 3);

      // Assert
      expect(
        mockTransactionRepository.findActiveByDescription,
      ).toHaveBeenCalledWith(
        userId,
        searchText,
        DESCRIPTION_SUGGESTIONS_SAMPLE_SIZE, // Should use default sample size
      );
    });

    it("should call repository with custom sample size when provided", async () => {
      // Arrange
      const searchText = "test";
      const customSampleSize = 50;
      mockTransactionRepository.findActiveByDescription.mockResolvedValue([]);

      // Act
      await service.getDescriptionSuggestions(
        userId,
        searchText,
        3,
        customSampleSize,
      );

      // Assert
      expect(
        mockTransactionRepository.findActiveByDescription,
      ).toHaveBeenCalledWith(userId, searchText, customSampleSize);
    });

    it("should throw error for search text shorter than minimum length", async () => {
      // Arrange
      const shortSearchText = "a".repeat(MIN_SEARCH_TEXT_LENGTH - 1);

      // Act & Assert
      await expect(
        service.getDescriptionSuggestions(userId, shortSearchText, 5),
      ).rejects.toThrow(BusinessError);

      await expect(
        service.getDescriptionSuggestions(userId, shortSearchText, 5),
      ).rejects.toMatchObject({
        message: `Search text must be at least ${MIN_SEARCH_TEXT_LENGTH} characters long`,
        code: BusinessErrorCodes.INVALID_PARAMETERS,
      });

      // Verify repository was not called
      expect(
        mockTransactionRepository.findActiveByDescription,
      ).not.toHaveBeenCalled();
    });

    it("should throw error for empty search text", async () => {
      // Arrange
      const emptySearchText = "";

      // Act & Assert
      await expect(
        service.getDescriptionSuggestions(userId, emptySearchText, 5),
      ).rejects.toThrow(BusinessError);
    });
  });
});
