import { faker } from "@faker-js/faker";
import {
  type Mocked,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { ModelError } from "../models/model-error";
import { Transaction, TransactionType } from "../models/transaction";
import { AccountRepository } from "../ports/account-repository";
import { AtomicWriter } from "../ports/atomic-writer";
import { CategoryRepository } from "../ports/category-repository";
import {
  TransactionFilterInput,
  TransactionRepository,
} from "../ports/transaction-repository";
import { toDateString } from "../types/date-string";
import { toDateTimeString } from "../types/date-time-string";
import { MAX_PAGE_SIZE, MIN_PAGE_SIZE } from "../types/pagination";
import { fakeAccount } from "../utils/test-utils/models/account-fakes";
import { fakeCategory } from "../utils/test-utils/models/category-fakes";
import {
  fakeExpense,
  fakeIncome,
  fakeTransaction,
  fakeTransactionPattern,
} from "../utils/test-utils/models/transaction-fakes";
import { createMockAccountRepository } from "../utils/test-utils/repositories/account-repository-mocks";
import { createMockAtomicWriter } from "../utils/test-utils/repositories/atomic-writer-mocks";
import { createMockCategoryRepository } from "../utils/test-utils/repositories/category-repository-mocks";
import { createMockTransactionRepository } from "../utils/test-utils/repositories/transaction-repository-mocks";
import {
  fakeCreateCompoundTransactionServiceInput,
  fakeCreateTransactionServiceInput,
} from "../utils/test-utils/services/transaction-service-fakes";
import { BusinessError } from "./business-error";
import {
  CreateCompoundTransactionServiceInput,
  DEFAULT_TRANSACTION_PATTERNS_LIMIT,
  DESCRIPTION_SUGGESTIONS_SAMPLE_SIZE,
  MAX_TRANSACTION_PATTERNS_LIMIT,
  MIN_SEARCH_TEXT_LENGTH,
  MIN_TRANSACTION_PATTERNS_LIMIT,
  TransactionService,
  TransactionServiceImpl,
} from "./transaction-service";

describe("TransactionService", () => {
  let service: TransactionService;
  let userId: string;
  let mockTransactionRepository: Mocked<TransactionRepository>;
  let mockAccountRepository: Mocked<AccountRepository>;
  let mockCategoryRepository: Mocked<CategoryRepository>;
  let mockAtomicWriter: Mocked<AtomicWriter>;

  beforeEach(() => {
    mockTransactionRepository = createMockTransactionRepository();
    mockAccountRepository = createMockAccountRepository();
    mockCategoryRepository = createMockCategoryRepository();
    mockAtomicWriter = createMockAtomicWriter();

    service = new TransactionServiceImpl({
      accountRepository: mockAccountRepository,
      categoryRepository: mockCategoryRepository,
      transactionRepository: mockTransactionRepository,
      atomicWriter: mockAtomicWriter,
    });
    userId = faker.string.uuid();
  });

  describe("getTransactionById", () => {
    // Happy path

    it("returns transaction when it exists", async () => {
      // Arrange
      const transactionId = faker.string.uuid();
      const existingTransaction = fakeTransaction();
      // Returns existing transaction
      mockTransactionRepository.findOneById.mockResolvedValue(
        existingTransaction,
      );

      // Act
      const result = await service.getTransactionById(transactionId, userId);

      // Assert
      expect(result).toBe(existingTransaction);
      expect(mockTransactionRepository.findOneById).toHaveBeenCalledWith({
        id: transactionId,
        userId,
      });
    });

    // Validation failures

    it("throws when transaction not found", async () => {
      // Arrange
      // Returns no transaction
      mockTransactionRepository.findOneById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getTransactionById(faker.string.uuid(), userId),
      ).rejects.toThrow(
        new BusinessError("Transaction not found or doesn't belong to user"),
      );
    });
  });

  describe("getTransactionsByUser", () => {
    // Happy path

    it("passes filters and pagination to repository", async () => {
      // Arrange
      const expectedResult = {
        edges: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        totalCount: 0,
      };
      const pagination = { first: 10 };
      const filters: TransactionFilterInput = {
        accountIds: ["account-1"],
        categoryIds: ["category-1"],
        includeUncategorized: true,
        dateAfter: toDateString("2024-01-10"),
        dateBefore: toDateString("2024-01-20"),
        types: ["INCOME"],
      };
      // Returns paginated transactions
      mockTransactionRepository.findManyByUserIdPaginated.mockResolvedValue(
        expectedResult,
      );

      // Act
      const result = await service.getTransactionsByUser(
        userId,
        pagination,
        filters,
      );

      // Assert
      expect(result).toEqual(expectedResult);
      expect(
        mockTransactionRepository.findManyByUserIdPaginated,
      ).toHaveBeenCalledWith(userId, pagination, filters);
    });

    // Validation failures

    it("throws when dateAfter is after dateBefore", async () => {
      // Act & Assert
      await expect(
        service.getTransactionsByUser(userId, undefined, {
          dateAfter: toDateString("2024-12-31"),
          dateBefore: toDateString("2024-01-01"),
        }),
      ).rejects.toThrow(
        new BusinessError("Filter dateAfter cannot be later than dateBefore"),
      );
      expect(
        mockTransactionRepository.findManyByUserIdPaginated,
      ).not.toHaveBeenCalled();
    });

    it("throws when pagination first is below minimum", async () => {
      // Act & Assert
      await expect(
        service.getTransactionsByUser(userId, { first: MIN_PAGE_SIZE - 1 }),
      ).rejects.toThrow(
        new BusinessError(
          `Pagination first must be between ${MIN_PAGE_SIZE} and ${MAX_PAGE_SIZE}`,
        ),
      );
    });

    it("throws when pagination first is above maximum", async () => {
      // Act & Assert
      await expect(
        service.getTransactionsByUser(userId, { first: MAX_PAGE_SIZE + 1 }),
      ).rejects.toThrow(
        new BusinessError(
          `Pagination first must be between ${MIN_PAGE_SIZE} and ${MAX_PAGE_SIZE}`,
        ),
      );
    });
  });

  describe("getTransactionPatterns", () => {
    // Happy path

    it("returns enriched patterns", async () => {
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
        type: "INCOME",
      });

      const category2 = fakeCategory({
        id: "category-2",
        userId,
        name: "Freelance",
        type: "INCOME",
      });

      // Returns raw patterns
      mockTransactionRepository.detectPatterns.mockResolvedValue(patterns);
      // Returns matching accounts
      mockAccountRepository.findOneById
        .mockResolvedValueOnce(account1)
        .mockResolvedValueOnce(account2);
      // Returns matching categories
      mockCategoryRepository.findOneById
        .mockResolvedValueOnce(category1)
        .mockResolvedValueOnce(category2);

      // Act
      const result = await service.getTransactionPatterns(
        userId,
        "INCOME",
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

    it("filters out patterns with deleted accounts", async () => {
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
        type: "INCOME",
      });

      // Returns raw patterns
      mockTransactionRepository.detectPatterns.mockResolvedValue(patterns);
      // Returns one account, then null for deleted
      mockAccountRepository.findOneById
        .mockResolvedValueOnce(account1)
        .mockResolvedValueOnce(null); // Deleted account
      // Returns category for first pattern
      mockCategoryRepository.findOneById.mockResolvedValueOnce(category1);

      // Act
      const result = await service.getTransactionPatterns(
        userId,
        "INCOME",
        3,
        100,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.accountId).toBe("account-1");
    });

    it("filters out patterns with deleted categories", async () => {
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
        type: "INCOME",
      });

      // Returns raw patterns
      mockTransactionRepository.detectPatterns.mockResolvedValue(patterns);
      // Returns matching accounts
      mockAccountRepository.findOneById
        .mockResolvedValueOnce(account1)
        .mockResolvedValueOnce(account2);
      // Returns one category, then null for deleted
      mockCategoryRepository.findOneById
        .mockResolvedValueOnce(category1)
        .mockResolvedValueOnce(null); // Deleted category

      // Act
      const result = await service.getTransactionPatterns(
        userId,
        "INCOME",
        3,
        100,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.categoryId).toBe("category-1");
    });

    it("filters out patterns with mismatched category types", async () => {
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
        type: "INCOME",
      });

      const expenseCategory = fakeCategory({
        id: "category-expense",
        userId,
        name: "Food",
        type: "EXPENSE", // Wrong type for INCOME transaction
      });

      // Returns raw patterns
      mockTransactionRepository.detectPatterns.mockResolvedValue(patterns);
      // Returns matching accounts
      mockAccountRepository.findOneById
        .mockResolvedValueOnce(account1)
        .mockResolvedValueOnce(account2);
      // Returns income category, then expense category
      mockCategoryRepository.findOneById
        .mockResolvedValueOnce(incomeCategory)
        .mockResolvedValueOnce(expenseCategory);

      // Act
      const result = await service.getTransactionPatterns(
        userId,
        "INCOME",
        3,
        100,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.categoryId).toBe("category-income");
    });

    it("returns empty array when all patterns are invalid", async () => {
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

      // Returns invalid patterns
      mockTransactionRepository.detectPatterns.mockResolvedValue(patterns);
      mockAccountRepository.findOneById.mockResolvedValue(null); // All accounts deleted
      mockCategoryRepository.findOneById.mockResolvedValue(null); // All categories deleted

      // Act
      const result = await service.getTransactionPatterns(
        userId,
        "INCOME",
        3,
        100,
      );

      // Assert
      expect(result).toEqual([]);
    });

    it("returns empty array for new users with no transaction history", async () => {
      // Arrange
      // Returns no patterns
      mockTransactionRepository.detectPatterns.mockResolvedValue([]);

      // Act
      const result = await service.getTransactionPatterns(
        userId,
        "INCOME",
        3,
        100,
      );

      // Assert
      expect(result).toEqual([]);
      expect(mockAccountRepository.findOneById).not.toHaveBeenCalled();
      expect(mockCategoryRepository.findOneById).not.toHaveBeenCalled();
    });

    it("passes correct parameters to repository", async () => {
      // Arrange
      mockTransactionRepository.detectPatterns.mockResolvedValue([]);

      // Act
      await service.getTransactionPatterns(userId, "EXPENSE", 5, 200);

      // Assert
      expect(mockTransactionRepository.detectPatterns).toHaveBeenCalledWith({
        userId,
        type: "EXPENSE",
        limit: 5,
        sampleSize: 200,
      });
    });

    describe("limit parameter validation", () => {
      beforeEach(() => {
        mockTransactionRepository.detectPatterns.mockResolvedValue([]);
      });

      it("uses default limit when no limit is provided", async () => {
        // Act
        await service.getTransactionPatterns(userId, "INCOME");

        // Assert
        expect(mockTransactionRepository.detectPatterns).toHaveBeenCalledWith({
          userId,
          type: "INCOME",
          limit: DEFAULT_TRANSACTION_PATTERNS_LIMIT,
          sampleSize: 100,
        });
      });

      it("uses default limit when limit is null", async () => {
        // Act
        await service.getTransactionPatterns(userId, "INCOME", null);

        // Assert
        expect(mockTransactionRepository.detectPatterns).toHaveBeenCalledWith({
          userId,
          type: "INCOME",
          limit: DEFAULT_TRANSACTION_PATTERNS_LIMIT,
          sampleSize: 100,
        });
      });

      it("uses default limit when limit is undefined", async () => {
        // Act
        await service.getTransactionPatterns(userId, "INCOME", undefined);

        // Assert
        expect(mockTransactionRepository.detectPatterns).toHaveBeenCalledWith({
          userId,
          type: "INCOME",
          limit: DEFAULT_TRANSACTION_PATTERNS_LIMIT,
          sampleSize: 100,
        });
      });

      it("accepts valid limit values between min and max", async () => {
        const validLimits = [
          MIN_TRANSACTION_PATTERNS_LIMIT,
          MIN_TRANSACTION_PATTERNS_LIMIT + 1,
          MAX_TRANSACTION_PATTERNS_LIMIT - 1,
          MAX_TRANSACTION_PATTERNS_LIMIT,
        ];

        for (const limit of validLimits) {
          // Act
          await service.getTransactionPatterns(userId, "INCOME", limit);

          // Assert
          expect(mockTransactionRepository.detectPatterns).toHaveBeenCalledWith(
            {
              userId,
              type: "INCOME",
              limit,
              sampleSize: 100,
            },
          );
        }
      });

      it("falls back to default limit for invalid values", async () => {
        const invalidLimits = [
          MIN_TRANSACTION_PATTERNS_LIMIT - 1,
          MAX_TRANSACTION_PATTERNS_LIMIT + 1,
        ];

        for (const limit of invalidLimits) {
          // Act
          await service.getTransactionPatterns(userId, "INCOME", limit);

          // Assert
          expect(mockTransactionRepository.detectPatterns).toHaveBeenCalledWith(
            {
              userId,
              type: "INCOME",
              limit: DEFAULT_TRANSACTION_PATTERNS_LIMIT,
              sampleSize: 100,
            },
          );
        }
      });

      it("falls back to default limit for non-integer values", async () => {
        const nonIntegerLimits = [1.5, 3.7, 5.9, 2.1];

        for (const limit of nonIntegerLimits) {
          // Act
          await service.getTransactionPatterns(userId, "INCOME", limit);

          // Assert
          expect(mockTransactionRepository.detectPatterns).toHaveBeenCalledWith(
            {
              userId,
              type: "INCOME",
              limit: DEFAULT_TRANSACTION_PATTERNS_LIMIT,
              sampleSize: 100,
            },
          );
        }
      });
    });
  });

  describe("getDescriptionSuggestions", () => {
    // Happy path

    it("returns suggestions ordered by frequency", async () => {
      // Arrange
      const searchText = "Gr";
      const transactions = [
        fakeTransaction({ description: "Grocery store" }),
        fakeTransaction({ description: "Grocery store" }),
        fakeTransaction({ description: "Grocery shopping" }),
        fakeTransaction({ description: "Great restaurant" }),
      ];
      // Returns matching transactions
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
      expect(result).toEqual([
        "Grocery store",
        "Grocery shopping",
        "Great restaurant",
      ]);
    });

    it("respects limit parameter", async () => {
      // Arrange
      const searchText = "te";
      const transactions = [
        fakeTransaction({ description: "Test 1" }),
        fakeTransaction({ description: "Test 2" }),
        fakeTransaction({ description: "Test 3" }),
        fakeTransaction({ description: "Test 4" }),
        fakeTransaction({ description: "Test 5" }),
      ];
      // Returns matching transactions
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

    it("returns empty array when no matches found", async () => {
      // Arrange
      const searchText = "xyz";
      // Returns no transactions
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

    it("calls repository with correct parameters", async () => {
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

    it("calls repository with custom sample size when provided", async () => {
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

    it("passes trimmed search text to repository", async () => {
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

    // Validation failures

    it("throws when search text is empty", async () => {
      // Act & Assert
      await expect(
        service.getDescriptionSuggestions(userId, "", 5),
      ).rejects.toThrow(
        new BusinessError(
          `Search text must be at least ${MIN_SEARCH_TEXT_LENGTH} characters long`,
        ),
      );
    });

    it("throws when search text is whitespace-only", async () => {
      // Act & Assert
      await expect(
        service.getDescriptionSuggestions(userId, "   ", 5),
      ).rejects.toThrow(
        new BusinessError(
          `Search text must be at least ${MIN_SEARCH_TEXT_LENGTH} characters long`,
        ),
      );
    });

    it("throws when search text is shorter than minimum length", async () => {
      // Act & Assert
      await expect(
        service.getDescriptionSuggestions(
          userId,
          "a".repeat(MIN_SEARCH_TEXT_LENGTH - 1),
          5,
        ),
      ).rejects.toThrow(
        new BusinessError(
          `Search text must be at least ${MIN_SEARCH_TEXT_LENGTH} characters long`,
        ),
      );
      expect(
        mockTransactionRepository.findManyByDescription,
      ).not.toHaveBeenCalled();
    });

    it("throws when search text becomes too short after trimming", async () => {
      // Act & Assert
      await expect(
        service.getDescriptionSuggestions(
          userId,
          `   ${"a".repeat(MIN_SEARCH_TEXT_LENGTH - 1)}   `,
          5,
        ),
      ).rejects.toThrow(
        new BusinessError(
          `Search text must be at least ${MIN_SEARCH_TEXT_LENGTH} characters long`,
        ),
      );
      expect(
        mockTransactionRepository.findManyByDescription,
      ).not.toHaveBeenCalled();
    });
  });

  describe("createTransaction", () => {
    // Happy path

    it("creates and returns transaction", async () => {
      // Arrange
      const account = fakeAccount({ userId, currency: "USD" });
      const category = fakeCategory({ userId, type: "EXPENSE" });
      const input = fakeCreateTransactionServiceInput({
        accountId: account.id,
        amount: 42.5,
        categoryId: category.id,
        date: toDateString("2000-12-31"),
        description: "Test transaction",
        type: "EXPENSE",
      });

      // Returns account owned by user
      mockAccountRepository.findOneById.mockResolvedValue(account);
      // Returns category owned by user
      mockCategoryRepository.findOneById.mockResolvedValue(category);

      // Persists and returns transaction
      const createdTransaction = fakeTransaction();
      mockAtomicWriter.commit.mockResolvedValue({
        createdTransactions: [createdTransaction],
        updatedTransactions: [],
        updatedAccounts: [],
      });

      // Act
      const result = await service.createTransaction(input, userId);

      // Assert
      expect(result).toBe(createdTransaction);

      expect(mockAtomicWriter.commit).toHaveBeenCalledTimes(1);

      const commitInput = mockAtomicWriter.commit.mock.calls[0]?.[0];
      expect(commitInput?.transactionsToCreate).toHaveLength(1);
      expect(commitInput?.transactionsToCreate?.[0]).toMatchObject({
        accountId: account.id,
        isArchived: false,
        version: 0,
        amount: 42.5,
        categoryId: category.id,
        currency: "USD",
        date: toDateString("2000-12-31"),
        description: "Test transaction",
        type: TransactionType.EXPENSE,
        userId,
      });
    });

    it("increases account balance", async () => {
      // Arrange
      const account = fakeAccount({ userId, transactionBalance: 100 });
      const input = fakeCreateTransactionServiceInput({
        accountId: account.id,
        categoryId: undefined,
        type: "INCOME",
        amount: 50,
      });
      // Returns account owned by user
      mockAccountRepository.findOneById.mockResolvedValue(account);
      // Persists and returns transaction
      mockAtomicWriter.commit.mockResolvedValue({
        createdTransactions: [fakeTransaction()],
        updatedTransactions: [],
        updatedAccounts: [],
      });

      // Act
      await service.createTransaction(input, userId);

      // Assert
      const commitInput = mockAtomicWriter.commit.mock.calls[0]?.[0];
      expect(commitInput?.accountsToUpdate).toHaveLength(1);
      expect(commitInput?.accountsToUpdate?.[0]?.transactionBalance).toBe(150);
    });

    it("skips category when categoryId is omitted", async () => {
      // Arrange
      const input = fakeCreateTransactionServiceInput({
        categoryId: undefined,
      });

      // Returns account owned by user
      mockAccountRepository.findOneById.mockResolvedValue(
        fakeAccount({ userId }),
      );

      // Persists and returns transaction
      mockAtomicWriter.commit.mockResolvedValue({
        createdTransactions: [fakeTransaction()],
        updatedTransactions: [],
        updatedAccounts: [],
      });

      // Act
      await service.createTransaction(input, userId);

      // Assert
      const commitInput = mockAtomicWriter.commit.mock.calls[0]?.[0];
      expect(
        commitInput?.transactionsToCreate?.[0]?.categoryId,
      ).toBeUndefined();
    });

    // Validation failures

    it("throws when account not found", async () => {
      // Arrange
      const input = fakeCreateTransactionServiceInput({
        categoryId: undefined,
      });

      // Returns no account
      mockAccountRepository.findOneById.mockResolvedValue(null);

      // Act
      const promise = service.createTransaction(input, userId);

      // Assert
      await expect(promise).rejects.toThrow(
        new BusinessError("Account not found or doesn't belong to user"),
      );
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    it("throws when category not found", async () => {
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
      await expect(promise).rejects.toThrow(
        new BusinessError("Category not found or doesn't belong to user"),
      );
      expect(mockCategoryRepository.findOneById).toHaveBeenCalledWith({
        id: categoryId,
        userId,
      });
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    it("propagates ModelError without persisting", async () => {
      // Arrange
      const input = fakeCreateTransactionServiceInput({
        categoryId: undefined,
        amount: -1, // Invalid amount
      });

      // Returns account owned by user
      mockAccountRepository.findOneById.mockResolvedValue(
        fakeAccount({ userId }),
      );

      // Act
      const promise = service.createTransaction(input, userId);

      // Assert
      await expect(promise).rejects.toThrow(
        new ModelError("Amount must be positive"),
      );
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });
  });

  describe("createCompoundTransaction", () => {
    beforeEach(() => {
      vi.useFakeTimers().setSystemTime(new Date("2000-02-03:00:00.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // Happy path

    it("creates and returns one transaction per leg", async () => {
      // Arrange
      const account = fakeAccount({ userId, currency: "USD" });
      const categoryA = fakeCategory({ userId, type: "EXPENSE" });
      const categoryB = fakeCategory({ userId, type: "EXPENSE" });
      const input: CreateCompoundTransactionServiceInput = {
        accountId: account.id,
        date: toDateString("2000-01-02"),
        expectedTotal: 15,
        type: "EXPENSE",
        legs: [
          {
            amount: 10,
            categoryId: categoryA.id,
            description: "Some food",
          },
          {
            amount: 5,
            categoryId: categoryB.id,
            description: "Some drinks",
          },
        ],
      };

      // Returns account owned by user
      mockAccountRepository.findOneById.mockResolvedValue(account);

      // Returns each leg's category owned by user, in leg order
      mockCategoryRepository.findOneById
        .mockResolvedValueOnce(categoryA)
        .mockResolvedValueOnce(categoryB);

      // Persists and returns both legs
      const createdTransactions = [fakeExpense(), fakeExpense()];
      mockAtomicWriter.commit.mockResolvedValue({
        createdTransactions,
        updatedTransactions: [],
        updatedAccounts: [],
      });

      // Act
      const result = await service.createCompoundTransaction(input, userId);

      // Assert
      expect(result).toEqual(createdTransactions);

      expect(mockAtomicWriter.commit).toHaveBeenCalledTimes(1);
      const commitInput = mockAtomicWriter.commit.mock.calls[0]?.[0];
      const transactionsToCreate = commitInput?.transactionsToCreate ?? [];

      expect(transactionsToCreate).toHaveLength(2);
      expect(transactionsToCreate[0]).toBeInstanceOf(Transaction);
      expect(transactionsToCreate[1]).toBeInstanceOf(Transaction);

      expect(transactionsToCreate[0]?.toData()).toEqual({
        accountId: account.id,
        amount: 10,
        categoryId: categoryA.id,
        createdAt: toDateTimeString("2000-02-03T00:00:00.000Z"),
        currency: "USD",
        date: toDateString("2000-01-02"),
        description: "Some food",
        id: expect.any(String),
        isArchived: false,
        transferId: undefined,
        type: TransactionType.EXPENSE,
        updatedAt: toDateTimeString("2000-02-03T00:00:00.000Z"),
        userId,
        version: 0,
        compoundTransaction: {
          id: expect.any(String),
          totalAmount: 15,
        },
      });

      expect(transactionsToCreate[1]?.toData()).toEqual({
        accountId: account.id,
        amount: 5,
        categoryId: categoryB.id,
        createdAt: toDateTimeString("2000-02-03T00:00:00.000Z"),
        currency: "USD",
        date: toDateString("2000-01-02"),
        description: "Some drinks",
        id: expect.any(String),
        isArchived: false,
        transferId: undefined,
        type: TransactionType.EXPENSE,
        updatedAt: toDateTimeString("2000-02-03T00:00:00.000Z"),
        userId,
        version: 0,
        compoundTransaction: {
          id: expect.any(String),
          totalAmount: 15,
        },
      });
    });

    it("stamps every leg with same compoundTransaction id and totalAmount", async () => {
      // Arrange
      const account = fakeAccount({ userId });
      const categoryA = fakeCategory({ userId, type: "EXPENSE" });
      const categoryB = fakeCategory({ userId, type: "EXPENSE" });
      const input = fakeCreateCompoundTransactionServiceInput({
        accountId: account.id,
        type: "EXPENSE",
        legs: [
          {
            amount: 10,
            categoryId: categoryA.id,
          },
          {
            amount: 5,
            categoryId: categoryB.id,
          },
        ],
      });

      // Returns account owned by user
      mockAccountRepository.findOneById.mockResolvedValue(account);

      // Returns category owned by user for every leg
      mockCategoryRepository.findOneById
        .mockResolvedValueOnce(categoryA)
        .mockResolvedValueOnce(categoryB);

      // Persists and returns both legs
      mockAtomicWriter.commit.mockResolvedValue({
        createdTransactions: [fakeExpense(), fakeExpense()],
        updatedTransactions: [],
        updatedAccounts: [],
      });

      // Act
      await service.createCompoundTransaction(input, userId);

      // Assert
      const commitInput = mockAtomicWriter.commit.mock.calls[0]?.[0];
      const transactionsToCreate = commitInput?.transactionsToCreate ?? [];

      const compoundTransactionIds = transactionsToCreate.map(
        (transaction) => transaction.compoundTransaction?.id,
      );
      expect(new Set(compoundTransactionIds).size).toBe(1);

      const compoundTransactionTotalAmounts = transactionsToCreate.map(
        (transaction) => transaction.compoundTransaction?.totalAmount,
      );
      expect(new Set(compoundTransactionTotalAmounts).size).toBe(1);
    });

    it("folds all legs into one account balance update", async () => {
      // Arrange
      const account = fakeAccount({ userId, transactionBalance: 100 });
      const categoryA = fakeCategory({ userId, type: "EXPENSE" });
      const categoryB = fakeCategory({ userId, type: "EXPENSE" });
      const input = fakeCreateCompoundTransactionServiceInput({
        accountId: account.id,
        type: "EXPENSE",
        legs: [
          {
            amount: 10,
            categoryId: categoryA.id,
          },
          {
            amount: 5,
            categoryId: categoryB.id,
          },
        ],
      });

      // Returns account owned by user
      mockAccountRepository.findOneById.mockResolvedValue(account);

      // Returns category owned by user for every leg
      mockCategoryRepository.findOneById
        .mockResolvedValueOnce(categoryA)
        .mockResolvedValueOnce(categoryB);

      // Persists and returns both legs
      mockAtomicWriter.commit.mockResolvedValue({
        createdTransactions: [fakeExpense(), fakeExpense()],
        updatedTransactions: [],
        updatedAccounts: [],
      });

      // Act
      await service.createCompoundTransaction(input, userId);

      // Assert
      const commitInput = mockAtomicWriter.commit.mock.calls[0]?.[0];
      expect(commitInput?.accountsToUpdate).toHaveLength(1);
      expect(commitInput?.accountsToUpdate?.[0]?.transactionBalance).toBe(85);
    });

    // Validation failures

    it("rejects fewer than 2 legs", async () => {
      // Arrange
      const input = fakeCreateCompoundTransactionServiceInput({
        legs: [
          {
            amount: 10,
            categoryId: faker.string.uuid(),
          },
        ],
      });

      // Act
      const promise = service.createCompoundTransaction(input, userId);

      // Assert
      await expect(promise).rejects.toThrow(
        new BusinessError("Compound transaction requires at least 2 legs"),
      );
      expect(mockAccountRepository.findOneById).not.toHaveBeenCalled();
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    it("rejects when leg amounts do not sum to expected total", async () => {
      // Arrange
      const input = fakeCreateCompoundTransactionServiceInput({
        expectedTotal: 20,
        legs: [
          {
            amount: 10,
            categoryId: faker.string.uuid(),
          },
          {
            amount: 5,
            categoryId: faker.string.uuid(),
          },
        ],
      });

      // Act
      const promise = service.createCompoundTransaction(input, userId);

      // Assert
      await expect(promise).rejects.toThrow(
        new BusinessError("Leg amounts must sum to the expected total"),
      );
      expect(mockAccountRepository.findOneById).not.toHaveBeenCalled();
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    it("rejects duplicate categoryIds across legs", async () => {
      // Arrange
      const input = fakeCreateCompoundTransactionServiceInput({
        legs: [
          {
            amount: 10,
            categoryId: "same-category",
          },
          {
            amount: 5,
            categoryId: "same-category",
          },
        ],
      });

      // Act
      const promise = service.createCompoundTransaction(input, userId);

      // Assert
      await expect(promise).rejects.toThrow(
        new BusinessError(
          "Compound transaction legs must have distinct categories, with at most one uncategorized leg",
        ),
      );
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    it("rejects more than one uncategorized leg", async () => {
      // Arrange
      const input = fakeCreateCompoundTransactionServiceInput({
        legs: [{ amount: 10 }, { amount: 5 }],
      });

      // Act
      const promise = service.createCompoundTransaction(input, userId);

      // Assert
      await expect(promise).rejects.toThrow(
        new BusinessError(
          "Compound transaction legs must have distinct categories, with at most one uncategorized leg",
        ),
      );
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    it("throws when account not found", async () => {
      // Arrange
      const input = fakeCreateCompoundTransactionServiceInput();

      // Returns no account
      mockAccountRepository.findOneById.mockResolvedValue(null);

      // Act
      const promise = service.createCompoundTransaction(input, userId);

      // Assert
      await expect(promise).rejects.toThrow(
        new BusinessError("Account not found or doesn't belong to user"),
      );
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    it("throws when category not found", async () => {
      // Arrange
      const account = fakeAccount({ userId });
      const categoryA = fakeCategory({ userId, type: "EXPENSE" });
      const input = fakeCreateCompoundTransactionServiceInput({
        accountId: account.id,
        type: "EXPENSE",
        legs: [
          {
            amount: 10,
            categoryId: categoryA.id,
          },
          {
            amount: 5,
            categoryId: faker.string.uuid(),
          },
        ],
      });

      // Returns account owned by user
      mockAccountRepository.findOneById.mockResolvedValue(account);

      // Returns no category for one leg
      mockCategoryRepository.findOneById
        .mockResolvedValueOnce(categoryA)
        .mockResolvedValueOnce(null);

      // Act
      const promise = service.createCompoundTransaction(input, userId);

      // Assert
      await expect(promise).rejects.toThrow(
        new BusinessError("Category not found or doesn't belong to user"),
      );
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    it("throws when category type does not match transaction type", async () => {
      // Arrange
      const account = fakeAccount({ userId });
      const validCategory = fakeCategory({ userId, type: "EXPENSE" });
      const wrongCategory = fakeCategory({ userId, type: "INCOME" });
      const input = fakeCreateCompoundTransactionServiceInput({
        accountId: account.id,
        type: "EXPENSE",
        legs: [
          {
            amount: 10,
            categoryId: validCategory.id,
          },
          {
            amount: 5,
            categoryId: wrongCategory.id,
          },
        ],
      });

      // Returns account owned by user
      mockAccountRepository.findOneById.mockResolvedValue(account);

      // Returns categories with mismatched type
      mockCategoryRepository.findOneById
        .mockResolvedValueOnce(validCategory)
        .mockResolvedValueOnce(wrongCategory);

      // Act
      const promise = service.createCompoundTransaction(input, userId);

      // Assert
      await expect(promise).rejects.toThrow(
        new BusinessError(
          'Category type "INCOME" doesn\'t match transaction type "EXPENSE"',
        ),
      );
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    it("propagates ModelError without persisting", async () => {
      // Arrange
      const account = fakeAccount({ userId });
      const categoryA = fakeCategory({ userId, type: "EXPENSE" });
      const categoryB = fakeCategory({ userId, type: "EXPENSE" });
      const input = fakeCreateCompoundTransactionServiceInput({
        accountId: account.id,
        type: "EXPENSE",
        legs: [
          {
            amount: 10,
            categoryId: categoryA.id,
          },
          {
            amount: -5,
            categoryId: categoryB.id,
          },
        ],
      });

      // Returns account owned by user
      mockAccountRepository.findOneById.mockResolvedValue(account);

      // Returns each leg's category owned by user, in leg order
      mockCategoryRepository.findOneById
        .mockResolvedValueOnce(categoryA)
        .mockResolvedValueOnce(categoryB);

      // Act
      const promise = service.createCompoundTransaction(input, userId);

      // Assert
      await expect(promise).rejects.toThrow(
        new ModelError("Amount must be positive"),
      );
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });
  });

  describe("updateTransaction", () => {
    // Happy path

    it("returns persisted transaction", async () => {
      // Arrange
      const existingTransaction = fakeIncome({
        userId,
      });
      const existingAccount = fakeAccount({
        userId,
        id: existingTransaction.accountId,
      });
      const newAccount = fakeAccount({ userId });
      const newCategory = fakeCategory({ userId, type: "EXPENSE" });
      const persistedTransaction = fakeTransaction();
      // Returns existing transaction
      mockTransactionRepository.findOneById.mockResolvedValue(
        existingTransaction,
      );
      // Returns new account owned by user
      mockAccountRepository.findOneById.mockResolvedValue(newAccount);
      // Returns existing account
      mockAccountRepository.findOneWithArchivedById.mockResolvedValue(
        existingAccount,
      );
      // Returns new category owned by user
      mockCategoryRepository.findOneById.mockResolvedValue(newCategory);
      // Persists and returns transaction
      mockAtomicWriter.commit.mockResolvedValue({
        createdTransactions: [],
        updatedTransactions: [persistedTransaction],
        updatedAccounts: [],
      });

      // Act
      const result = await service.updateTransaction(
        existingTransaction.id,
        userId,
        {
          accountId: newAccount.id,
          amount: 200,
          categoryId: newCategory.id,
          date: toDateString("2000-12-31"),
          description: "Updated transaction",
          type: "EXPENSE",
        },
      );

      // Assert
      expect(result).toBe(persistedTransaction);
      const commitInput = mockAtomicWriter.commit.mock.calls[0]?.[0];
      expect(commitInput?.transactionsToUpdate).toHaveLength(1);
      expect(commitInput?.transactionsToUpdate?.[0]).toMatchObject({
        accountId: newAccount.id,
        amount: 200,
        categoryId: newCategory.id,
        currency: newAccount.currency,
        date: toDateString("2000-12-31"),
        description: "Updated transaction",
        id: existingTransaction.id,
        type: TransactionType.EXPENSE,
        userId,
      });
    });

    it("preserves account when accountId is omitted", async () => {
      // Arrange
      const existingTransaction = fakeExpense({
        userId,
      });
      const existingAccount = fakeAccount({
        userId,
        id: existingTransaction.accountId,
      });
      // Returns existing transaction
      mockTransactionRepository.findOneById.mockResolvedValue(
        existingTransaction,
      );
      // Returns existing account
      mockAccountRepository.findOneWithArchivedById.mockResolvedValue(
        existingAccount,
      );
      // Persists and returns transaction
      mockAtomicWriter.commit.mockResolvedValue({
        createdTransactions: [],
        updatedTransactions: [fakeTransaction()],
        updatedAccounts: [],
      });

      // Act
      await service.updateTransaction(existingTransaction.id, userId, {
        amount: 5,
      });

      // Assert
      const commitInput = mockAtomicWriter.commit.mock.calls[0]?.[0];
      expect(commitInput?.transactionsToUpdate?.[0]?.accountId).toBe(
        existingTransaction.accountId,
      );
      expect(commitInput?.transactionsToUpdate?.[0]?.amount).toBe(5);
    });

    it("clears category when categoryId is null", async () => {
      // Arrange
      const existingTransaction = fakeExpense({
        userId,
        categoryId: faker.string.uuid(),
      });
      // Returns existing transaction
      mockTransactionRepository.findOneById.mockResolvedValue(
        existingTransaction,
      );
      // Persists and returns transaction
      mockAtomicWriter.commit.mockResolvedValue({
        createdTransactions: [],
        updatedTransactions: [fakeTransaction()],
        updatedAccounts: [],
      });

      // Act
      await service.updateTransaction(existingTransaction.id, userId, {
        categoryId: null,
      });

      // Assert
      const commitInput = mockAtomicWriter.commit.mock.calls[0]?.[0];
      expect(
        commitInput?.transactionsToUpdate?.[0]?.categoryId,
      ).toBeUndefined();
    });

    it("skips account update when balance is unaffected", async () => {
      // Arrange
      const existingTransaction = fakeIncome({
        userId,
        amount: 10,
      });
      // Returns existing transaction
      mockTransactionRepository.findOneById.mockResolvedValue(
        existingTransaction,
      );
      // Persists and returns transaction
      mockAtomicWriter.commit.mockResolvedValue({
        createdTransactions: [],
        updatedTransactions: [fakeTransaction()],
        updatedAccounts: [],
      });

      // Act
      await service.updateTransaction(existingTransaction.id, userId, {
        description: "new note",
      });

      // Assert
      const commitInput = mockAtomicWriter.commit.mock.calls[0]?.[0];
      expect(commitInput?.accountsToUpdate).toEqual([]);
    });

    it("updates balance when amount changes on same account", async () => {
      // Arrange
      const existingAccount = fakeAccount({ userId, transactionBalance: 100 });
      const existingTransaction = fakeExpense({
        accountId: existingAccount.id,
        userId,
        amount: 30,
      });
      // Returns existing transaction
      mockTransactionRepository.findOneById.mockResolvedValue(
        existingTransaction,
      );
      // Returns existing account
      mockAccountRepository.findOneWithArchivedById.mockResolvedValue(
        existingAccount,
      );
      // Persists and returns transaction
      mockAtomicWriter.commit.mockResolvedValue({
        createdTransactions: [],
        updatedTransactions: [fakeTransaction()],
        updatedAccounts: [],
      });

      // Act
      await service.updateTransaction(existingTransaction.id, userId, {
        amount: 50,
      });

      // Assert
      const commitInput = mockAtomicWriter.commit.mock.calls[0]?.[0];
      // 100 + 30 (revert -30) - 50 (apply -50) = 80
      expect(commitInput?.accountsToUpdate).toHaveLength(1);
      expect(commitInput?.accountsToUpdate?.[0]?.transactionBalance).toBe(80);
    });

    it("updates both accounts when account changes", async () => {
      // Arrange
      const existingAccount = fakeAccount({ userId, transactionBalance: 100 });
      const newAccount = fakeAccount({ userId, transactionBalance: 0 });
      const existingTransaction = fakeExpense({
        accountId: existingAccount.id,
        userId,
        amount: 30,
      });
      // Returns existing transaction
      mockTransactionRepository.findOneById.mockResolvedValue(
        existingTransaction,
      );
      // Returns new account owned by user
      mockAccountRepository.findOneById.mockResolvedValue(newAccount);
      // Returns existing account
      mockAccountRepository.findOneWithArchivedById.mockResolvedValue(
        existingAccount,
      );
      // Persists and returns transaction
      mockAtomicWriter.commit.mockResolvedValue({
        createdTransactions: [],
        updatedTransactions: [fakeTransaction()],
        updatedAccounts: [],
      });

      // Act
      await service.updateTransaction(existingTransaction.id, userId, {
        accountId: newAccount.id,
      });

      // Assert
      const commitInput = mockAtomicWriter.commit.mock.calls[0]?.[0];
      expect(commitInput?.accountsToUpdate).toHaveLength(2);
      // existing: 100 + 30 (revert -30) = 130
      expect(
        commitInput?.accountsToUpdate?.find((a) => a.id === existingAccount.id)
          ?.transactionBalance,
      ).toBe(130);
      // new: 0 + (-30) = -30
      expect(
        commitInput?.accountsToUpdate?.find((a) => a.id === newAccount.id)
          ?.transactionBalance,
      ).toBe(-30);
    });

    it("updates balance when type changes", async () => {
      // Arrange
      const existingAccount = fakeAccount({ userId, transactionBalance: 100 });
      const existingTransaction = fakeExpense({
        accountId: existingAccount.id,
        userId,
        amount: 20,
      });
      // Returns existing transaction
      mockTransactionRepository.findOneById.mockResolvedValue(
        existingTransaction,
      );
      // Returns existing account
      mockAccountRepository.findOneWithArchivedById.mockResolvedValue(
        existingAccount,
      );
      // Persists and returns transaction
      mockAtomicWriter.commit.mockResolvedValue({
        createdTransactions: [],
        updatedTransactions: [fakeTransaction()],
        updatedAccounts: [],
      });

      // Act
      await service.updateTransaction(existingTransaction.id, userId, {
        type: "INCOME",
      });

      // Assert
      const commitInput = mockAtomicWriter.commit.mock.calls[0]?.[0];
      // 100 + 20 (revert -20) + 20 (apply +20) = 140
      expect(commitInput?.accountsToUpdate).toHaveLength(1);
      expect(commitInput?.accountsToUpdate?.[0]?.transactionBalance).toBe(140);
    });

    // Validation failures

    it("throws when transaction not found", async () => {
      // Arrange
      // Returns no transaction
      mockTransactionRepository.findOneById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateTransaction(faker.string.uuid(), userId, { amount: 1 }),
      ).rejects.toThrow(
        new BusinessError("Transaction not found or doesn't belong to user"),
      );
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    it("throws when account not found", async () => {
      // Arrange
      const existingTransaction = fakeTransaction({ userId });
      // Returns existing transaction
      mockTransactionRepository.findOneById.mockResolvedValue(
        existingTransaction,
      );
      // Returns no account
      mockAccountRepository.findOneById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateTransaction(existingTransaction.id, userId, {
          accountId: faker.string.uuid(),
        }),
      ).rejects.toThrow(
        new BusinessError("Account not found or doesn't belong to user"),
      );
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    it("propagates ModelError when amount is invalid", async () => {
      // Arrange
      const existingTransaction = fakeExpense({
        userId,
      });
      // Returns existing transaction
      mockTransactionRepository.findOneById.mockResolvedValue(
        existingTransaction,
      );

      // Act & Assert
      await expect(
        service.updateTransaction(existingTransaction.id, userId, {
          amount: -1,
        }),
      ).rejects.toThrow(ModelError);
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });
  });

  describe("deleteTransaction", () => {
    // Happy path

    it("returns persisted archived transaction", async () => {
      // Arrange
      const existingTransaction = fakeTransaction({ userId });
      const existingAccount = fakeAccount({
        userId,
        id: existingTransaction.accountId,
      });
      const persistedTransaction = fakeTransaction({ isArchived: true });
      // Returns existing transaction
      mockTransactionRepository.findOneById.mockResolvedValue(
        existingTransaction,
      );
      // Returns existing account
      mockAccountRepository.findOneWithArchivedById.mockResolvedValue(
        existingAccount,
      );
      // Persists and returns archived transaction
      mockAtomicWriter.commit.mockResolvedValue({
        createdTransactions: [],
        updatedTransactions: [persistedTransaction],
        updatedAccounts: [],
      });

      // Act
      const result = await service.deleteTransaction(
        existingTransaction.id,
        userId,
      );

      // Assert
      expect(result).toBe(persistedTransaction);
      const commitInput = mockAtomicWriter.commit.mock.calls[0]?.[0];
      expect(commitInput?.transactionsToUpdate).toHaveLength(1);
      expect(commitInput?.transactionsToUpdate?.[0]?.isArchived).toBe(true);
    });

    it("decreases account balance", async () => {
      // Arrange
      const existingAccount = fakeAccount({ userId, transactionBalance: 100 });
      const existingTransaction = fakeExpense({
        accountId: existingAccount.id,
        userId,
        amount: 30,
      });
      // Returns existing transaction
      mockTransactionRepository.findOneById.mockResolvedValue(
        existingTransaction,
      );
      // Returns existing account
      mockAccountRepository.findOneWithArchivedById.mockResolvedValue(
        existingAccount,
      );
      // Persists and returns archived transaction
      mockAtomicWriter.commit.mockResolvedValue({
        createdTransactions: [],
        updatedTransactions: [fakeTransaction()],
        updatedAccounts: [],
      });

      // Act
      await service.deleteTransaction(existingTransaction.id, userId);

      // Assert
      const commitInput = mockAtomicWriter.commit.mock.calls[0]?.[0];
      // 100 + 30 (revert -30) = 130
      expect(commitInput?.accountsToUpdate).toHaveLength(1);
      expect(commitInput?.accountsToUpdate?.[0]?.transactionBalance).toBe(130);
    });

    it("returns existing transaction without commit when already archived", async () => {
      // Arrange
      const existingTransaction = fakeTransaction({ userId, isArchived: true });
      // Returns archived transaction
      mockTransactionRepository.findOneById.mockResolvedValue(
        existingTransaction,
      );

      // Act
      const result = await service.deleteTransaction(
        existingTransaction.id,
        userId,
      );

      // Assert
      expect(result).toBe(existingTransaction);
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    // Validation failures

    it("throws when transaction not found", async () => {
      // Arrange
      // Returns no transaction
      mockTransactionRepository.findOneById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.deleteTransaction(faker.string.uuid(), userId),
      ).rejects.toThrow(
        new BusinessError("Transaction not found or doesn't belong to user"),
      );
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });
  });
});
