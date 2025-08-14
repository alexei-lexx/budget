import { TransactionService } from "./TransactionService";
import { QuickActionTransactionType, TransactionType } from "../models/Transaction";
import { CategoryType } from "../models/Category";
import { faker } from "@faker-js/faker";
import {
  createMockTransactionRepository,
  createMockAccountRepository,
  createMockCategoryRepository,
} from "../__tests__/utils/mockRepositories";
import {
  fakeAccount,
  fakeCategory,
  fakeAccountCategoryPattern,
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

  describe("getQuickActionPatterns", () => {
    it("should return enriched patterns for valid account and category combinations", async () => {
      // Arrange
      const patterns = [
        fakeAccountCategoryPattern({
          accountId: "account-1",
          categoryId: "category-1",
        }),
        fakeAccountCategoryPattern({
          accountId: "account-2",
          categoryId: "category-2",
        }),
      ];

      const account1 = fakeAccount({
        id: "account-1",
        userId,
        name: "Checking Account",
        currency: "USD",
      });

      const account2 = fakeAccount({
        id: "account-2",
        userId,
        name: "Savings Account",
        currency: "USD",
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

      mockTransactionRepository.getAccountCategoryPatterns.mockResolvedValue(
        patterns,
      );
      mockAccountRepository.findActiveById
        .mockResolvedValueOnce(account1)
        .mockResolvedValueOnce(account2);
      mockCategoryRepository.findActiveById
        .mockResolvedValueOnce(category1)
        .mockResolvedValueOnce(category2);

      // Act
      const result = await service.getQuickActionPatterns(
        userId,
        QuickActionTransactionType.INCOME,
        3,
        100,
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        accountId: "account-1",
        categoryId: "category-1",
        accountName: "Checking Account",
        accountCurrency: "USD",
        categoryName: "Salary",
        categoryType: CategoryType.INCOME,
      });
      expect(result[1]).toEqual({
        accountId: "account-2",
        categoryId: "category-2",
        accountName: "Savings Account",
        accountCurrency: "USD",
        categoryName: "Freelance",
        categoryType: CategoryType.INCOME,
      });
    });

    it("should filter out patterns with deleted accounts", async () => {
      // Arrange
      const patterns = [
        fakeAccountCategoryPattern({
          accountId: "account-1",
          categoryId: "category-1",
        }),
        fakeAccountCategoryPattern({
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

      mockTransactionRepository.getAccountCategoryPatterns.mockResolvedValue(
        patterns,
      );
      mockAccountRepository.findActiveById
        .mockResolvedValueOnce(account1)
        .mockResolvedValueOnce(null); // Deleted account
      mockCategoryRepository.findActiveById.mockResolvedValueOnce(category1);

      // Act
      const result = await service.getQuickActionPatterns(
        userId,
        QuickActionTransactionType.INCOME,
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
        fakeAccountCategoryPattern({
          accountId: "account-1",
          categoryId: "category-1",
        }),
        fakeAccountCategoryPattern({
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

      mockTransactionRepository.getAccountCategoryPatterns.mockResolvedValue(
        patterns,
      );
      mockAccountRepository.findActiveById
        .mockResolvedValueOnce(account1)
        .mockResolvedValueOnce(account2);
      mockCategoryRepository.findActiveById
        .mockResolvedValueOnce(category1)
        .mockResolvedValueOnce(null); // Deleted category

      // Act
      const result = await service.getQuickActionPatterns(
        userId,
        QuickActionTransactionType.INCOME,
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
        fakeAccountCategoryPattern({
          accountId: "account-1",
          categoryId: "category-income",
        }),
        fakeAccountCategoryPattern({
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

      mockTransactionRepository.getAccountCategoryPatterns.mockResolvedValue(
        patterns,
      );
      mockAccountRepository.findActiveById
        .mockResolvedValueOnce(account1)
        .mockResolvedValueOnce(account2);
      mockCategoryRepository.findActiveById
        .mockResolvedValueOnce(incomeCategory)
        .mockResolvedValueOnce(expenseCategory);

      // Act
      const result = await service.getQuickActionPatterns(
        userId,
        QuickActionTransactionType.INCOME,
        3,
        100,
      );

      // Assert - Only income category pattern should be returned
      expect(result).toHaveLength(1);
      expect(result[0].categoryType).toBe(CategoryType.INCOME);
    });

    it("should return empty array when all patterns are invalid", async () => {
      // Arrange
      const patterns = [
        fakeAccountCategoryPattern({
          accountId: "account-deleted",
          categoryId: "category-1",
        }),
        fakeAccountCategoryPattern({
          accountId: "account-2",
          categoryId: "category-deleted",
        }),
      ];

      mockTransactionRepository.getAccountCategoryPatterns.mockResolvedValue(
        patterns,
      );
      mockAccountRepository.findActiveById.mockResolvedValue(null); // All accounts deleted
      mockCategoryRepository.findActiveById.mockResolvedValue(null); // All categories deleted

      // Act
      const result = await service.getQuickActionPatterns(
        userId,
        QuickActionTransactionType.INCOME,
        3,
        100,
      );

      // Assert
      expect(result).toEqual([]);
    });

    it("should return empty array for new users with no transaction history", async () => {
      // Arrange
      mockTransactionRepository.getAccountCategoryPatterns.mockResolvedValue(
        [],
      );

      // Act
      const result = await service.getQuickActionPatterns(
        userId,
        QuickActionTransactionType.INCOME,
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
      mockTransactionRepository.getAccountCategoryPatterns.mockResolvedValue(
        [],
      );

      // Act
      await service.getQuickActionPatterns(
        userId,
        QuickActionTransactionType.EXPENSE,
        5,
        200,
      );

      // Assert
      expect(
        mockTransactionRepository.getAccountCategoryPatterns,
      ).toHaveBeenCalledWith(userId, TransactionType.EXPENSE, 5, 200);
    });
  });
});
