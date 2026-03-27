import { faker } from "@faker-js/faker";
import { Category, CategoryType } from "../models/category";
import { TransactionPatternType, TransactionType } from "../models/transaction";
import { toDateString } from "../types/date";
import { MAX_PAGE_SIZE, MIN_PAGE_SIZE } from "../types/pagination";
import {
  DESCRIPTION_MAX_LENGTH,
  MIN_SEARCH_TEXT_LENGTH,
} from "../types/validation";
import {
  fakeAccount,
  fakeCategory,
  fakeTransaction,
  fakeTransactionPattern,
} from "../utils/test-utils/factories";
import {
  createMockAccountRepository,
  createMockCategoryRepository,
  createMockTransactionRepository,
} from "../utils/test-utils/mock-repositories";
import { fakeCreateTransactionServiceInput } from "../utils/test-utils/service-factories";
import { BusinessError } from "./business-error";
import {
  DEFAULT_TRANSACTION_PATTERNS_LIMIT,
  DESCRIPTION_SUGGESTIONS_SAMPLE_SIZE,
  MAX_TRANSACTION_PATTERNS_LIMIT,
  MIN_TRANSACTION_PATTERNS_LIMIT,
  TransactionService,
} from "./transaction-service";

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

  describe("getTransactionById", () => {
    it("should return transaction when it exists", async () => {
      // Arrange
      const transactionId = faker.string.uuid();
      const transaction = fakeTransaction();

      mockTransactionRepository.findOneById.mockResolvedValue(transaction);

      // Act
      const result = await service.getTransactionById(transactionId, userId);

      // Assert
      expect(result).toEqual(transaction);
      expect(mockTransactionRepository.findOneById).toHaveBeenCalledWith(
        transactionId,
        userId,
      );
      expect(mockTransactionRepository.findOneById).toHaveBeenCalledTimes(1);
    });

    it("should throw error when transaction not found", async () => {
      // Arrange
      const transactionId = faker.string.uuid();
      mockTransactionRepository.findOneById.mockResolvedValue(null);

      // Act & Assert
      const promise = service.getTransactionById(transactionId, userId);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Transaction not found or doesn't belong to user",
      });

      expect(mockTransactionRepository.findOneById).toHaveBeenCalledWith(
        transactionId,
        userId,
      );
    });
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
      mockAccountRepository.findOneById
        .mockResolvedValueOnce(account1)
        .mockResolvedValueOnce(account2);
      mockCategoryRepository.findOneById
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
      mockAccountRepository.findOneById
        .mockResolvedValueOnce(account1)
        .mockResolvedValueOnce(null); // Deleted account
      mockCategoryRepository.findOneById.mockResolvedValueOnce(category1);

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
      mockAccountRepository.findOneById
        .mockResolvedValueOnce(account1)
        .mockResolvedValueOnce(account2);
      mockCategoryRepository.findOneById
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
      mockAccountRepository.findOneById
        .mockResolvedValueOnce(account1)
        .mockResolvedValueOnce(account2);
      mockCategoryRepository.findOneById
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
      mockAccountRepository.findOneById.mockResolvedValue(null); // All accounts deleted
      mockCategoryRepository.findOneById.mockResolvedValue(null); // All categories deleted

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
      expect(mockAccountRepository.findOneById).not.toHaveBeenCalled();
      expect(mockCategoryRepository.findOneById).not.toHaveBeenCalled();
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

      mockTransactionRepository.findManyByDescription.mockResolvedValue(
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

      mockTransactionRepository.findManyByDescription.mockResolvedValue(
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
      mockTransactionRepository.findManyByDescription.mockResolvedValue([]);

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
      mockTransactionRepository.findManyByDescription.mockResolvedValue([]);

      // Act
      await service.getDescriptionSuggestions(userId, searchText, 3);

      // Assert
      expect(
        mockTransactionRepository.findManyByDescription,
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
      mockTransactionRepository.findManyByDescription.mockResolvedValue([]);

      // Act
      await service.getDescriptionSuggestions(
        userId,
        searchText,
        3,
        customSampleSize,
      );

      // Assert
      expect(
        mockTransactionRepository.findManyByDescription,
      ).toHaveBeenCalledWith(userId, searchText, customSampleSize);
    });

    it("should throw error for search text shorter than minimum length", async () => {
      const shortSearchText = "a".repeat(MIN_SEARCH_TEXT_LENGTH - 1);
      const promise = service.getDescriptionSuggestions(
        userId,
        shortSearchText,
        5,
      );

      await expect(promise).rejects.toThrow(BusinessError);

      await expect(promise).rejects.toMatchObject({
        message: `Search text must be at least ${MIN_SEARCH_TEXT_LENGTH} characters long`,
      });

      expect(
        mockTransactionRepository.findManyByDescription,
      ).not.toHaveBeenCalled();
    });

    it("should throw error for empty search text", async () => {
      const emptySearchText = "";
      const promise = service.getDescriptionSuggestions(
        userId,
        emptySearchText,
        5,
      );

      await expect(promise).rejects.toThrow(BusinessError);

      await expect(promise).rejects.toMatchObject({
        message: `Search text must be at least ${MIN_SEARCH_TEXT_LENGTH} characters long`,
      });
    });

    it("should throw error for whitespace-only search text", async () => {
      const whitespaceSearchText = "   ";
      const promise = service.getDescriptionSuggestions(
        userId,
        whitespaceSearchText,
        5,
      );

      await expect(promise).rejects.toThrow(BusinessError);

      await expect(promise).rejects.toMatchObject({
        message: `Search text must be at least ${MIN_SEARCH_TEXT_LENGTH} characters long`,
      });

      expect(
        mockTransactionRepository.findManyByDescription,
      ).not.toHaveBeenCalled();
    });

    it("should pass trimmed search text to repository", async () => {
      // Arrange
      const searchTextWithWhitespace = "  test  ";
      mockTransactionRepository.findManyByDescription.mockResolvedValue([]);

      // Act
      await service.getDescriptionSuggestions(
        userId,
        searchTextWithWhitespace,
        5,
      );

      // Assert - should pass trimmed text to repository
      expect(
        mockTransactionRepository.findManyByDescription,
      ).toHaveBeenCalledWith(
        userId,
        "test", // Trimmed version
        DESCRIPTION_SUGGESTIONS_SAMPLE_SIZE,
      );
    });

    it("should throw error when text is too short after trimming", async () => {
      // Arrange - Text that looks long but is too short after trimming
      const shortTextWithPadding = "   a   "; // 7 chars before trim, 1 char after
      const promise = service.getDescriptionSuggestions(
        userId,
        shortTextWithPadding,
        5,
      );

      // Assert
      await expect(promise).rejects.toThrow(BusinessError);

      await expect(promise).rejects.toMatchObject({
        message: `Search text must be at least ${MIN_SEARCH_TEXT_LENGTH} characters long`,
      });

      expect(
        mockTransactionRepository.findManyByDescription,
      ).not.toHaveBeenCalled();
    });
  });

  describe("getTransactionsByUser", () => {
    it("should pass filters correctly to repository", async () => {
      // Arrange
      const expectedResult = {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
        },
        totalCount: 0,
      };
      mockTransactionRepository.findManyByUserIdPaginated.mockResolvedValue(
        expectedResult,
      );

      const pagination = { first: 10 };
      const filters = {
        accountIds: ["account-1", "account-2"],
        categoryIds: ["category-1"],
        includeUncategorized: true,
        dateAfter: toDateString("2024-01-10"),
        dateBefore: toDateString("2024-01-20"),
        types: [TransactionType.INCOME],
      };

      // Act
      const result = await service.getTransactionsByUser(
        userId,
        pagination,
        filters,
      );

      // Assert - Service should pass all parameters through to repository unchanged
      expect(result).toEqual(expectedResult);
      expect(
        mockTransactionRepository.findManyByUserIdPaginated,
      ).toHaveBeenCalledWith(userId, pagination, filters);
      expect(
        mockTransactionRepository.findManyByUserIdPaginated,
      ).toHaveBeenCalledTimes(1);
    });

    it("should throw error for invalid date range (dateAfter > dateBefore)", async () => {
      const promise = service.getTransactionsByUser(userId, undefined, {
        dateAfter: toDateString("2024-12-31"),
        dateBefore: toDateString("2024-01-01"),
      });

      await expect(promise).rejects.toThrow(BusinessError);

      await expect(promise).rejects.toMatchObject({
        message: "Filter dateAfter cannot be later than dateBefore",
      });

      expect(
        mockTransactionRepository.findManyByUserIdPaginated,
      ).not.toHaveBeenCalled();
    });

    it("should throw for pagination first below minimum", async () => {
      const promise = service.getTransactionsByUser(userId, { first: 0 });

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Pagination first must be between ${MIN_PAGE_SIZE} and ${MAX_PAGE_SIZE}`,
      });
    });

    it("should throw for pagination first above maximum", async () => {
      const promise = service.getTransactionsByUser(userId, {
        first: MAX_PAGE_SIZE + 1,
      });

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({});
    });
  });

  describe("createTransaction", () => {
    describe("validation", () => {
      beforeEach(() => {
        const account = fakeAccount({ userId });
        mockAccountRepository.findOneById.mockResolvedValue(account);
      });

      it("should throw for amount of zero", async () => {
        const input = fakeCreateTransactionServiceInput({
          amount: 0,
        });

        const promise = service.createTransaction(input, userId);

        await expect(promise).rejects.toThrow(BusinessError);
        await expect(promise).rejects.toMatchObject({
          message: "Transaction amount must be positive",
        });
      });

      it("should throw for negative amount", async () => {
        const input = fakeCreateTransactionServiceInput({
          amount: -100,
        });

        const promise = service.createTransaction(input, userId);

        await expect(promise).rejects.toThrow(BusinessError);
        await expect(promise).rejects.toMatchObject({
          message: "Transaction amount must be positive",
        });
      });

      it("should throw for description exceeding maximum length", async () => {
        const input = fakeCreateTransactionServiceInput({
          description: "x".repeat(DESCRIPTION_MAX_LENGTH + 1),
        });

        const promise = service.createTransaction(input, userId);

        await expect(promise).rejects.toThrow(BusinessError);
        await expect(promise).rejects.toMatchObject({
          message: `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`,
        });
      });
    });

    describe("with REFUND type", () => {
      const currency = "EUR";
      let accountId: string;
      let expenseCategory: Category;
      let incomeCategory: Category;

      beforeEach(() => {
        const account = fakeAccount({ currency, userId });
        accountId = account.id;
        expenseCategory = fakeCategory({
          userId,
          type: CategoryType.EXPENSE,
        });
        incomeCategory = fakeCategory({
          userId,
          type: CategoryType.INCOME,
        });

        mockAccountRepository.findOneById.mockResolvedValue(account);
        mockTransactionRepository.create.mockResolvedValue(
          fakeTransaction({ type: TransactionType.REFUND }),
        );
      });

      it("should allow REFUND transaction with EXPENSE category", async () => {
        // Arrange
        const input = fakeCreateTransactionServiceInput({
          accountId,
          categoryId: expenseCategory.id,
          type: TransactionType.REFUND,
        });

        mockCategoryRepository.findOneById.mockResolvedValue(expenseCategory);

        // Act
        const result = await service.createTransaction(input, userId);

        // Assert
        expect(result).toBeDefined();
        expect(mockAccountRepository.findOneById).toHaveBeenCalledWith(
          accountId,
          userId,
        );
        expect(mockCategoryRepository.findOneById).toHaveBeenCalledWith(
          expenseCategory.id,
          userId,
        );
        expect(mockTransactionRepository.create).toHaveBeenCalledWith({
          ...input,
          currency,
          userId,
        });
      });

      it("should reject REFUND transaction with INCOME category", async () => {
        // Arrange
        const input = fakeCreateTransactionServiceInput({
          accountId,
          categoryId: incomeCategory.id,
          type: TransactionType.REFUND,
        });

        mockCategoryRepository.findOneById.mockResolvedValue(incomeCategory);

        // Act & Assert
        const promise = service.createTransaction(input, userId);

        await expect(promise).rejects.toThrow(BusinessError);
        await expect(promise).rejects.toMatchObject({
          message: `Category type "${CategoryType.INCOME}" doesn't match transaction type "${TransactionType.REFUND}"`,
        });

        expect(mockTransactionRepository.create).not.toHaveBeenCalled();
      });

      it("should allow REFUND transaction without category (uncategorized)", async () => {
        // Arrange
        const input = fakeCreateTransactionServiceInput({
          accountId,
          categoryId: undefined,
          type: TransactionType.REFUND,
        });

        // Act
        const result = await service.createTransaction(input, userId);

        // Assert
        expect(result).toBeDefined();
        expect(mockCategoryRepository.findOneById).not.toHaveBeenCalled();
        expect(mockTransactionRepository.create).toHaveBeenCalled();
      });
    });
  });

  describe("updateTransaction", () => {
    describe("validation", () => {
      let transactionId: string;

      beforeEach(() => {
        const transaction = fakeTransaction({ userId });
        transactionId = transaction.id;

        mockTransactionRepository.findOneById.mockResolvedValue(transaction);
      });

      it("should throw for amount of zero", async () => {
        const promise = service.updateTransaction(transactionId, userId, {
          amount: 0,
        });

        await expect(promise).rejects.toThrow(BusinessError);
        await expect(promise).rejects.toMatchObject({
          message: "Transaction amount must be positive",
        });
      });

      it("should throw for negative amount", async () => {
        const promise = service.updateTransaction(transactionId, userId, {
          amount: -50,
        });

        await expect(promise).rejects.toThrow(BusinessError);
        await expect(promise).rejects.toMatchObject({
          message: "Transaction amount must be positive",
        });
      });

      it("should throw for description exceeding maximum length", async () => {
        const promise = service.updateTransaction(transactionId, userId, {
          description: "x".repeat(DESCRIPTION_MAX_LENGTH + 1),
        });

        await expect(promise).rejects.toThrow(BusinessError);
        await expect(promise).rejects.toMatchObject({
          message: `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`,
        });
      });
    });
  });
});
