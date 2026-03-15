import { faker } from "@faker-js/faker";
import { CategoryType } from "../models/category";
import { TransactionType } from "../models/transaction";
import { isDateString, toDateString } from "../types/date";
import { daysBetween } from "../utils/date";
import {
  fakeAccount,
  fakeCategory,
  fakeTransaction,
} from "../utils/test-utils/factories";
import {
  createMockAccountRepository,
  createMockCategoryRepository,
  createMockTransactionRepository,
} from "../utils/test-utils/mock-repositories";
import {
  AgentDataService,
  CATEGORY_HISTORY_LOOKBACK_DAYS,
  CATEGORY_HISTORY_MAX_DESCRIPTIONS_PER_CATEGORY,
  EntityScope,
} from "./agent-data-service";
import { IAccountRepository } from "./ports/account-repository";
import { ICategoryRepository } from "./ports/category-repository";
import { ITransactionRepository } from "./ports/transaction-repository";

describe("AgentDataService", () => {
  let service: AgentDataService;
  let mockTransactionRepository: jest.Mocked<ITransactionRepository>;
  let mockAccountRepository: jest.Mocked<IAccountRepository>;
  let mockCategoryRepository: jest.Mocked<ICategoryRepository>;

  const userId = faker.string.uuid();

  beforeEach(() => {
    mockAccountRepository = createMockAccountRepository();
    mockCategoryRepository = createMockCategoryRepository();
    mockTransactionRepository = createMockTransactionRepository();

    // Create service instance with mocked repositories
    service = new AgentDataService(
      mockAccountRepository,
      mockCategoryRepository,
      mockTransactionRepository,
    );
  });

  describe("getAccounts", () => {
    it("should return all accounts when scope is all", async () => {
      // Arrange
      const mockAccounts = [
        fakeAccount({ isArchived: true }),
        fakeAccount({ isArchived: false }),
      ];
      mockAccountRepository.findAllByUserId.mockResolvedValue(mockAccounts);

      // Act
      const result = await service.getAccounts(userId, EntityScope.ALL);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].isArchived).toBe(true);
      expect(result[1].isArchived).toBe(false);
    });

    it("should return only active accounts when scope is active", async () => {
      // Arrange
      const mockAccounts = [
        fakeAccount({ isArchived: true }),
        fakeAccount({ isArchived: false }),
      ];
      mockAccountRepository.findAllByUserId.mockResolvedValue(mockAccounts);

      // Act
      const result = await service.getAccounts(userId, EntityScope.ACTIVE);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].isArchived).toBe(false);
    });

    it("should return only archived accounts when scope is archived", async () => {
      // Arrange
      const mockAccounts = [
        fakeAccount({ isArchived: true }),
        fakeAccount({ isArchived: false }),
      ];
      mockAccountRepository.findAllByUserId.mockResolvedValue(mockAccounts);

      // Act
      const result = await service.getAccounts(userId, EntityScope.ARCHIVED);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].isArchived).toBe(true);
    });

    it("should return plain account objects with required fields", async () => {
      // Arrange
      const mockAccounts = [
        fakeAccount({
          userId,
          name: "Checking Account",
          currency: "USD",
          isArchived: false,
        }),
        fakeAccount({
          userId,
          name: "Savings Account",
          currency: "EUR",
          isArchived: true,
        }),
      ];
      mockAccountRepository.findAllByUserId.mockResolvedValue(mockAccounts);

      // Act
      const result = await service.getAccounts(userId, EntityScope.ALL);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: mockAccounts[0].id,
        name: "Checking Account",
        currency: "USD",
        isArchived: false,
      });
      expect(result[1]).toEqual({
        id: mockAccounts[1].id,
        name: "Savings Account",
        currency: "EUR",
        isArchived: true,
      });
      expect(mockAccountRepository.findAllByUserId).toHaveBeenCalledWith(
        userId,
      );
    });

    it("should return empty array when user has no accounts", async () => {
      // Arrange
      mockAccountRepository.findAllByUserId.mockResolvedValue([]);

      // Act
      const result = await service.getAccounts(userId, EntityScope.ALL);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("getCategories", () => {
    it("should return all categories when scope is all", async () => {
      // Arrange
      const mockCategories = [
        fakeCategory({ isArchived: true }),
        fakeCategory({ isArchived: false }),
      ];
      mockCategoryRepository.findAllByUserId.mockResolvedValue(mockCategories);
      mockTransactionRepository.findActiveByUserId.mockResolvedValue([]);

      // Act
      const result = await service.getCategories(userId, EntityScope.ALL);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].isArchived).toBe(true);
      expect(result[1].isArchived).toBe(false);
    });

    it("should return only active categories when scope is active", async () => {
      // Arrange
      const mockCategories = [
        fakeCategory({ isArchived: true }),
        fakeCategory({ isArchived: false }),
      ];
      mockCategoryRepository.findAllByUserId.mockResolvedValue(mockCategories);
      mockTransactionRepository.findActiveByUserId.mockResolvedValue([]);

      // Act
      const result = await service.getCategories(userId, EntityScope.ACTIVE);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].isArchived).toBe(false);
    });

    it("should return only archived categories when scope is archived", async () => {
      // Arrange
      const mockCategories = [
        fakeCategory({ isArchived: true }),
        fakeCategory({ isArchived: false }),
      ];
      mockCategoryRepository.findAllByUserId.mockResolvedValue(mockCategories);
      mockTransactionRepository.findActiveByUserId.mockResolvedValue([]);

      // Act
      const result = await service.getCategories(userId, EntityScope.ARCHIVED);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].isArchived).toBe(true);
    });

    it("should return plain category objects with required fields", async () => {
      // Arrange
      const mockCategories = [
        fakeCategory({
          userId,
          name: "Groceries",
          type: CategoryType.EXPENSE,
          isArchived: false,
        }),
        fakeCategory({
          userId,
          name: "Salary",
          type: CategoryType.INCOME,
          isArchived: true,
        }),
      ];
      mockCategoryRepository.findAllByUserId.mockResolvedValue(mockCategories);
      mockTransactionRepository.findActiveByUserId.mockResolvedValue([]);

      // Act
      const result = await service.getCategories(userId, EntityScope.ALL);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: mockCategories[0].id,
        name: "Groceries",
        type: CategoryType.EXPENSE,
        isArchived: false,
        recentDescriptions: [],
      });
      expect(result[1]).toEqual({
        id: mockCategories[1].id,
        name: "Salary",
        type: CategoryType.INCOME,
        isArchived: true,
        recentDescriptions: [],
      });
      expect(mockCategoryRepository.findAllByUserId).toHaveBeenCalledWith(
        userId,
      );
    });

    it("should return empty array when user has no categories", async () => {
      // Arrange
      mockCategoryRepository.findAllByUserId.mockResolvedValue([]);
      mockTransactionRepository.findActiveByUserId.mockResolvedValue([]);

      // Act
      const result = await service.getCategories(userId, EntityScope.ALL);

      // Assert
      expect(result).toEqual([]);
    });

    it("should return recentDescriptions as empty array when no transactions exist", async () => {
      // Arrange
      const category = fakeCategory({ isArchived: false });
      mockCategoryRepository.findAllByUserId.mockResolvedValue([category]);
      mockTransactionRepository.findActiveByUserId.mockResolvedValue([]);

      // Act
      const result = await service.getCategories(userId, EntityScope.ACTIVE);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: category.id,
        recentDescriptions: [],
      });
    });

    it("should exclude transactions without categoryId from recentDescriptions", async () => {
      // Arrange
      const category = fakeCategory({ isArchived: false });
      const transactionsWithoutCategory = [
        fakeTransaction({
          categoryId: undefined,
          description: "should be ignored",
        }),
        fakeTransaction({
          categoryId: undefined,
          description: "also ignored",
        }),
      ];
      mockCategoryRepository.findAllByUserId.mockResolvedValue([category]);
      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        transactionsWithoutCategory,
      );

      // Act
      const result = await service.getCategories(userId, EntityScope.ACTIVE);

      // Assert
      expect(result[0].recentDescriptions).toEqual([]);
    });

    it("should exclude transactions without description from recentDescriptions", async () => {
      // Arrange
      const category = fakeCategory({ isArchived: false });
      const transactionsWithoutDescription = [
        fakeTransaction({
          categoryId: category.id,
          description: undefined,
        }),
        fakeTransaction({
          categoryId: category.id,
          description: undefined,
        }),
      ];
      mockCategoryRepository.findAllByUserId.mockResolvedValue([category]);
      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        transactionsWithoutDescription,
      );

      // Act
      const result = await service.getCategories(userId, EntityScope.ACTIVE);

      // Assert
      expect(result[0].recentDescriptions).toEqual([]);
    });

    it("should exclude transactions with unknown categoryId from recentDescriptions", async () => {
      // Arrange
      const activeCategory = fakeCategory({ isArchived: false });
      const archivedCategory = fakeCategory({ isArchived: true });

      const transactions = [
        fakeTransaction({
          categoryId: activeCategory.id,
          description: "milk and eggs",
        }),
        fakeTransaction({
          categoryId: archivedCategory.id,
          description: "should be filtered out",
        }),
      ];

      mockCategoryRepository.findAllByUserId.mockResolvedValue([
        activeCategory,
        archivedCategory,
      ]);
      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        transactions,
      );

      // Act - scope is ACTIVE, so archived category should not be in the returned set
      const result = await service.getCategories(userId, EntityScope.ACTIVE);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: activeCategory.id,
        recentDescriptions: ["milk and eggs"],
      });
    });

    it("should cap recentDescriptions", async () => {
      // Arrange
      const category = fakeCategory({ isArchived: false });
      mockCategoryRepository.findAllByUserId.mockResolvedValue([category]);

      // Create +5 extra transactions with descriptions
      const transactions = Array.from(
        { length: CATEGORY_HISTORY_MAX_DESCRIPTIONS_PER_CATEGORY + 5 },
        (_, index) =>
          fakeTransaction({
            categoryId: category.id,
            description: `description ${index}`,
          }),
      );

      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        transactions,
      );

      // Act
      const result = await service.getCategories(userId, EntityScope.ACTIVE);

      // Assert
      expect(result[0].recentDescriptions).toHaveLength(
        CATEGORY_HISTORY_MAX_DESCRIPTIONS_PER_CATEGORY,
      );
      expect(result[0].recentDescriptions[0]).toEqual("description 0");
      expect(
        result[0].recentDescriptions[
          CATEGORY_HISTORY_MAX_DESCRIPTIONS_PER_CATEGORY - 1
        ],
      ).toEqual(
        `description ${CATEGORY_HISTORY_MAX_DESCRIPTIONS_PER_CATEGORY - 1}`,
      );
    });

    it("should group multiple descriptions by categoryId", async () => {
      // Arrange
      const groceryCategory = fakeCategory({ isArchived: false });
      const eatingOutCategory = fakeCategory({ isArchived: false });

      const transactions = [
        fakeTransaction({
          categoryId: groceryCategory.id,
          description: "whole foods",
        }),
        fakeTransaction({
          categoryId: eatingOutCategory.id,
          description: "pizza place",
        }),
        fakeTransaction({
          categoryId: groceryCategory.id,
          description: "costco",
        }),
        fakeTransaction({
          categoryId: eatingOutCategory.id,
          description: "sushi restaurant",
        }),
      ];

      mockCategoryRepository.findAllByUserId.mockResolvedValue([
        groceryCategory,
        eatingOutCategory,
      ]);
      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        transactions,
      );

      // Act
      const result = await service.getCategories(userId, EntityScope.ACTIVE);

      // Assert
      const groceries = result.find(
        (categoryData) => categoryData.id === groceryCategory.id,
      );
      const eatingOut = result.find(
        (categoryData) => categoryData.id === eatingOutCategory.id,
      );

      expect(groceries?.recentDescriptions).toEqual(["whole foods", "costco"]);
      expect(eatingOut?.recentDescriptions).toEqual([
        "pizza place",
        "sushi restaurant",
      ]);
    });

    it("should deduplicate repeated descriptions", async () => {
      // Arrange
      const category = fakeCategory({ isArchived: false });
      mockCategoryRepository.findAllByUserId.mockResolvedValue([category]);

      // Create multiple transactions with the same description
      const transactions = [
        fakeTransaction({
          categoryId: category.id,
          description: "ice cream",
        }),
        fakeTransaction({
          categoryId: category.id,
          description: "ice cream",
        }),
        fakeTransaction({
          categoryId: category.id,
          description: "milk",
        }),
        fakeTransaction({
          categoryId: category.id,
          description: "milk",
        }),
      ];

      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        transactions,
      );

      // Act
      const result = await service.getCategories(userId, EntityScope.ACTIVE);

      // Assert - should only see unique descriptions
      expect(result[0].recentDescriptions).toEqual(["ice cream", "milk"]);
      expect(result[0].recentDescriptions).toHaveLength(2);
    });

    it("should fetch transactions within the history lookback window", async () => {
      // Arrange
      const category = fakeCategory({ isArchived: false });
      mockCategoryRepository.findAllByUserId.mockResolvedValue([category]);
      mockTransactionRepository.findActiveByUserId.mockResolvedValue([]);

      // Act
      await service.getCategories(userId, EntityScope.ACTIVE);

      // Assert
      expect(
        mockTransactionRepository.findActiveByUserId,
      ).toHaveBeenCalledTimes(1);

      // Extract filters from call
      const callFilters =
        mockTransactionRepository.findActiveByUserId.mock.calls[0][1];

      // Verify date filters are valid DateString format (YYYY-MM-DD)
      expect(isDateString(callFilters?.dateAfter || "")).toBe(true);
      expect(isDateString(callFilters?.dateBefore || "")).toBe(true);

      // Verify lookback is approximately CATEGORY_HISTORY_LOOKBACK_DAYS days (allow 1 day variance for execution time)
      const dateAfter = new Date(callFilters?.dateAfter || "");
      const dateBefore = new Date(callFilters?.dateBefore || "");
      const daysDiff = daysBetween(dateAfter, dateBefore);

      expect(daysDiff).toBeGreaterThanOrEqual(
        CATEGORY_HISTORY_LOOKBACK_DAYS - 1,
      );
      expect(daysDiff).toBeLessThanOrEqual(CATEGORY_HISTORY_LOOKBACK_DAYS);
    });
  });

  describe("getFilteredTransactions", () => {
    it("should return plain transaction objects", async () => {
      // Arrange
      const transactions = [
        fakeTransaction({
          id: "transaction1",
          accountId: "account1",
          categoryId: "category1",
          type: TransactionType.EXPENSE,
          amount: 50,
          currency: "USD",
          date: toDateString("2024-01-15"),
          description: "Grocery shopping",
        }),
        fakeTransaction({
          id: "transaction2",
          accountId: "account2",
          categoryId: "category2",
          type: TransactionType.INCOME,
          amount: 1000,
          currency: "USD",
          date: toDateString("2024-01-20"),
          description: "Salary",
        }),
      ];
      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        transactions,
      );

      // Act
      const result = await service.getFilteredTransactions(
        userId,
        toDateString("2024-01-01"),
        toDateString("2024-01-31"),
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "transaction1",
        accountId: "account1",
        categoryId: "category1",
        type: TransactionType.EXPENSE,
        amount: 50,
        currency: "USD",
        date: "2024-01-15",
        description: "Grocery shopping",
        transferId: undefined,
      });
      expect(result[1]).toEqual({
        id: "transaction2",
        accountId: "account2",
        categoryId: "category2",
        type: TransactionType.INCOME,
        amount: 1000,
        currency: "USD",
        date: "2024-01-20",
        description: "Salary",
        transferId: undefined,
      });
      expect(mockTransactionRepository.findActiveByUserId).toHaveBeenCalledWith(
        userId,
        {
          dateAfter: "2024-01-01",
          dateBefore: "2024-01-31",
        },
      );
    });

    it("should support categoryId filter", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      mockTransactionRepository.findActiveByUserId.mockResolvedValue([]);

      // Act
      await service.getFilteredTransactions(
        userId,
        toDateString("2024-01-01"),
        toDateString("2024-01-31"),
        categoryId,
      );

      // Assert
      expect(mockTransactionRepository.findActiveByUserId).toHaveBeenCalledWith(
        userId,
        {
          dateAfter: "2024-01-01",
          dateBefore: "2024-01-31",
          categoryIds: [categoryId],
        },
      );
    });

    it("should support accountId filter", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      mockTransactionRepository.findActiveByUserId.mockResolvedValue([]);

      // Act
      await service.getFilteredTransactions(
        userId,
        toDateString("2024-01-01"),
        toDateString("2024-01-31"),
        undefined,
        accountId,
      );

      // Assert
      expect(mockTransactionRepository.findActiveByUserId).toHaveBeenCalledWith(
        userId,
        {
          dateAfter: "2024-01-01",
          dateBefore: "2024-01-31",
          accountIds: [accountId],
        },
      );
    });

    it("should support both categoryId and accountId filters", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      const accountId = faker.string.uuid();
      mockTransactionRepository.findActiveByUserId.mockResolvedValue([]);

      // Act
      await service.getFilteredTransactions(
        userId,
        toDateString("2024-01-01"),
        toDateString("2024-01-31"),
        categoryId,
        accountId,
      );

      // Assert
      expect(mockTransactionRepository.findActiveByUserId).toHaveBeenCalledWith(
        userId,
        {
          dateAfter: "2024-01-01",
          dateBefore: "2024-01-31",
          categoryIds: [categoryId],
          accountIds: [accountId],
        },
      );
    });
  });
});
