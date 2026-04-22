import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { CategoryType } from "../models/category";
import { ModelError } from "../models/model-error";
import {
  TransactionPatternType,
  TransactionType,
  createTransactionModel,
  updateTransactionModel,
} from "../models/transaction";
import { toDateString } from "../types/date";
import { MAX_PAGE_SIZE, MIN_PAGE_SIZE } from "../types/pagination";
import { MIN_SEARCH_TEXT_LENGTH } from "../types/validation";
import { fakeAccount } from "../utils/test-utils/models/account-fakes";
import { fakeCategory } from "../utils/test-utils/models/category-fakes";
import {
  fakeTransaction,
  fakeTransactionPattern,
} from "../utils/test-utils/models/transaction-fakes";
import { createMockAccountRepository } from "../utils/test-utils/repositories/account-repository-mocks";
import { createMockCategoryRepository } from "../utils/test-utils/repositories/category-repository-mocks";
import { createMockTransactionRepository } from "../utils/test-utils/repositories/transaction-repository-mocks";
import { fakeCreateTransactionServiceInput } from "../utils/test-utils/services/transaction-service-fakes";
import { BusinessError } from "./business-error";
import {
  DEFAULT_TRANSACTION_PATTERNS_LIMIT,
  DESCRIPTION_SUGGESTIONS_SAMPLE_SIZE,
  MAX_TRANSACTION_PATTERNS_LIMIT,
  MIN_TRANSACTION_PATTERNS_LIMIT,
  TransactionService,
  TransactionServiceImpl,
} from "./transaction-service";

describe("TransactionService", () => {
  let service: TransactionService;
  let userId: string;
  let mockTransactionRepository: ReturnType<
    typeof createMockTransactionRepository
  >;
  let mockAccountRepository: ReturnType<typeof createMockAccountRepository>;
  let mockCategoryRepository: ReturnType<typeof createMockCategoryRepository>;
  let mockCreateTransactionModel: jest.MockedFunction<
    typeof createTransactionModel
  >;
  let mockUpdateTransactionModel: jest.MockedFunction<
    typeof updateTransactionModel
  >;

  beforeEach(() => {
    mockTransactionRepository = createMockTransactionRepository();
    mockAccountRepository = createMockAccountRepository();
    mockCategoryRepository = createMockCategoryRepository();
    mockCreateTransactionModel = jest.fn<typeof createTransactionModel>();
    mockUpdateTransactionModel = jest.fn<typeof updateTransactionModel>();

    service = new TransactionServiceImpl({
      accountRepository: mockAccountRepository,
      categoryRepository: mockCategoryRepository,
      transactionRepository: mockTransactionRepository,
      createTransactionModel: mockCreateTransactionModel,
      updateTransactionModel: mockUpdateTransactionModel,
    });
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
      expect(mockTransactionRepository.findOneById).toHaveBeenCalledWith({
        id: transactionId,
        userId,
      });
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

      expect(mockTransactionRepository.findOneById).toHaveBeenCalledWith({
        id: transactionId,
        userId,
      });
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
      expect(mockTransactionRepository.detectPatterns).toHaveBeenCalledWith({
        userId,
        type: TransactionPatternType.EXPENSE,
        limit: 5,
        sampleSize: 200,
      });
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
        expect(mockTransactionRepository.detectPatterns).toHaveBeenCalledWith({
          userId,
          type: TransactionPatternType.INCOME,
          limit: DEFAULT_TRANSACTION_PATTERNS_LIMIT,
          sampleSize: 100,
        });
      });

      it("should use default limit when limit is null", async () => {
        // Act
        await service.getTransactionPatterns(
          userId,
          TransactionPatternType.INCOME,
          null,
        );

        // Assert
        expect(mockTransactionRepository.detectPatterns).toHaveBeenCalledWith({
          userId,
          type: TransactionPatternType.INCOME,
          limit: DEFAULT_TRANSACTION_PATTERNS_LIMIT,
          sampleSize: 100,
        });
      });

      it("should use default limit when limit is undefined", async () => {
        // Act
        await service.getTransactionPatterns(
          userId,
          TransactionPatternType.INCOME,
          undefined,
        );

        // Assert
        expect(mockTransactionRepository.detectPatterns).toHaveBeenCalledWith({
          userId,
          type: TransactionPatternType.INCOME,
          limit: DEFAULT_TRANSACTION_PATTERNS_LIMIT,
          sampleSize: 100,
        });
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
            {
              userId,
              type: TransactionPatternType.INCOME,
              limit,
              sampleSize: 100,
            },
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
            {
              userId,
              type: TransactionPatternType.INCOME,
              limit: DEFAULT_TRANSACTION_PATTERNS_LIMIT,
              sampleSize: 100,
            },
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
            {
              userId,
              type: TransactionPatternType.INCOME,
              limit: DEFAULT_TRANSACTION_PATTERNS_LIMIT,
              sampleSize: 100,
            },
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
      ).toHaveBeenCalledWith({
        userId,
        searchText,
        limit: DESCRIPTION_SUGGESTIONS_SAMPLE_SIZE,
      });
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
      ).toHaveBeenCalledWith({ userId, searchText, limit: customSampleSize });
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
      ).toHaveBeenCalledWith({
        userId,
        searchText: "test",
        limit: DESCRIPTION_SUGGESTIONS_SAMPLE_SIZE,
      });
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
    // Happy path

    it("should create and return transaction", async () => {
      // Arrange
      const account = fakeAccount({ userId });
      const category = fakeCategory({ userId, type: CategoryType.EXPENSE });
      const createdTransaction = fakeTransaction();
      const input = fakeCreateTransactionServiceInput({
        accountId: account.id,
        categoryId: category.id,
        type: TransactionType.EXPENSE,
      });

      // Returns account owned by user
      mockAccountRepository.findOneById.mockResolvedValue(account);
      // Returns category owned by user
      mockCategoryRepository.findOneById.mockResolvedValue(category);
      // Returns built transaction
      mockCreateTransactionModel.mockReturnValue(createdTransaction);
      // Persists transaction
      mockTransactionRepository.create.mockResolvedValue();

      // Act
      const result = await service.createTransaction(input, userId);

      // Assert
      expect(result).toBe(createdTransaction);
      expect(mockCreateTransactionModel).toHaveBeenCalledTimes(1);
      expect(mockCreateTransactionModel).toHaveBeenCalledWith({
        ...input,
        userId,
        account,
        category,
      });
      expect(mockTransactionRepository.create).toHaveBeenCalledTimes(1);
      expect(mockTransactionRepository.create).toHaveBeenCalledWith(
        createdTransaction,
      );
    });

    it("should skip category when categoryId is omitted", async () => {
      // Arrange
      const input = fakeCreateTransactionServiceInput({
        categoryId: undefined,
      });

      // Returns account owned by user
      mockAccountRepository.findOneById.mockResolvedValue(fakeAccount());
      // Returns built transaction
      mockCreateTransactionModel.mockReturnValue(fakeTransaction());

      // Act
      await service.createTransaction(input, userId);

      // Assert
      expect(mockCategoryRepository.findOneById).not.toHaveBeenCalled();
      expect(mockCreateTransactionModel).toHaveBeenCalledWith(
        expect.objectContaining({
          category: undefined,
        }),
      );
    });

    // Validation failures

    it("should throw BusinessError when account is not found", async () => {
      // Arrange
      const input = fakeCreateTransactionServiceInput({
        categoryId: undefined,
      });

      // Returns no account
      mockAccountRepository.findOneById.mockResolvedValue(null);

      // Act
      const promise = service.createTransaction(input, userId);

      // Assert
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Account not found or doesn't belong to user",
      });
      expect(mockCreateTransactionModel).not.toHaveBeenCalled();
      expect(mockTransactionRepository.create).not.toHaveBeenCalled();
    });

    it("should throw BusinessError when category is not found", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      const input = fakeCreateTransactionServiceInput({ categoryId });

      // Returns account owned by user
      mockAccountRepository.findOneById.mockResolvedValue(fakeAccount());
      // Returns no category
      mockCategoryRepository.findOneById.mockResolvedValue(null);

      // Act
      const promise = service.createTransaction(input, userId);

      // Assert
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Category not found or doesn't belong to user",
      });
      expect(mockCategoryRepository.findOneById).toHaveBeenCalledWith({
        id: categoryId,
        userId,
      });
      expect(mockCreateTransactionModel).not.toHaveBeenCalled();
      expect(mockTransactionRepository.create).not.toHaveBeenCalled();
    });

    it("should propagate factory errors without persisting", async () => {
      // Arrange
      const input = fakeCreateTransactionServiceInput({
        categoryId: undefined,
      });

      // Returns account owned by user
      mockAccountRepository.findOneById.mockResolvedValue(fakeAccount());
      // Factory rejects input
      mockCreateTransactionModel.mockImplementation(() => {
        throw new ModelError("Invalid transaction data");
      });

      // Act
      const promise = service.createTransaction(input, userId);

      // Assert
      await expect(promise).rejects.toThrow(ModelError);
      await expect(promise).rejects.toMatchObject({
        message: "Invalid transaction data",
      });
      expect(mockTransactionRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("updateTransaction", () => {
    // Happy path

    it("should return updated transaction", async () => {
      // Arrange
      const existing = fakeTransaction({ userId });
      const account = fakeAccount({ userId });
      const category = fakeCategory({ userId, type: CategoryType.EXPENSE });
      const updatedTransaction = fakeTransaction({
        id: existing.id,
        userId,
      });

      // Returns existing transaction
      mockTransactionRepository.findOneById.mockResolvedValue(existing);
      // Returns new account owned by user
      mockAccountRepository.findOneById.mockResolvedValue(account);
      // Returns new category owned by user
      mockCategoryRepository.findOneById.mockResolvedValue(category);
      // Returns built updated transaction
      mockUpdateTransactionModel.mockReturnValue(updatedTransaction);

      // Act
      const result = await service.updateTransaction(existing.id, userId, {
        accountId: account.id,
        categoryId: category.id,
        amount: 200,
      });

      // Assert
      expect(result).toBe(updatedTransaction);
      expect(mockUpdateTransactionModel).toHaveBeenCalledWith(existing, {
        account,
        category,
        type: undefined,
        amount: 200,
        date: undefined,
        description: undefined,
      });
      expect(mockTransactionRepository.update).toHaveBeenCalledWith(
        updatedTransaction,
      );
    });

    it("should skip account lookup when accountId is omitted", async () => {
      // Arrange
      const existing = fakeTransaction({ userId });
      // Returns existing transaction
      mockTransactionRepository.findOneById.mockResolvedValue(existing);
      // Returns built updated transaction
      mockUpdateTransactionModel.mockReturnValue(existing);

      // Act
      await service.updateTransaction(existing.id, userId, { amount: 5 });

      // Assert
      expect(mockAccountRepository.findOneById).not.toHaveBeenCalled();
      expect(mockUpdateTransactionModel).toHaveBeenCalledWith(
        existing,
        expect.objectContaining({ account: undefined }),
      );
    });

    it("should clear category when categoryId is null", async () => {
      // Arrange
      const existing = fakeTransaction({ userId });
      // Returns existing transaction
      mockTransactionRepository.findOneById.mockResolvedValue(existing);
      // Returns built updated transaction
      mockUpdateTransactionModel.mockReturnValue(existing);

      // Act
      await service.updateTransaction(existing.id, userId, {
        categoryId: null,
      });

      // Assert
      expect(mockCategoryRepository.findOneById).not.toHaveBeenCalled();
      expect(mockUpdateTransactionModel).toHaveBeenCalledWith(
        existing,
        expect.objectContaining({ category: null }),
      );
    });

    // Validation failures

    it("should throw when transaction not found", async () => {
      // Arrange
      // Returns no transaction
      mockTransactionRepository.findOneById.mockResolvedValue(null);

      // Act
      const promise = service.updateTransaction("id", userId, { amount: 1 });

      // Assert
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Transaction not found or doesn't belong to user",
      });
      expect(mockUpdateTransactionModel).not.toHaveBeenCalled();
      expect(mockTransactionRepository.update).not.toHaveBeenCalled();
    });

    it("should throw when account not found", async () => {
      // Arrange
      const existing = fakeTransaction({ userId });
      // Returns existing transaction
      mockTransactionRepository.findOneById.mockResolvedValue(existing);
      // Returns no account
      mockAccountRepository.findOneById.mockResolvedValue(null);

      // Act
      const promise = service.updateTransaction(existing.id, userId, {
        accountId: "missing",
      });

      // Assert
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Account not found or doesn't belong to user",
      });
      expect(mockUpdateTransactionModel).not.toHaveBeenCalled();
      expect(mockTransactionRepository.update).not.toHaveBeenCalled();
    });

    // Dependency failures

    it("should propagate ModelError without persisting", async () => {
      // Arrange
      const existing = fakeTransaction({ userId });
      // Returns existing transaction
      mockTransactionRepository.findOneById.mockResolvedValue(existing);
      // Model rejects input
      mockUpdateTransactionModel.mockImplementation(() => {
        throw new ModelError("Amount must be positive");
      });

      // Act
      const promise = service.updateTransaction(existing.id, userId, {
        amount: -1,
      });

      // Assert
      await expect(promise).rejects.toThrow(ModelError);
      expect(mockTransactionRepository.update).not.toHaveBeenCalled();
    });
  });
});
