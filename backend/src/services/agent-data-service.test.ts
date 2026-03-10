import { faker } from "@faker-js/faker";
import { IAccountRepository } from "../models/account";
import { CategoryType, ICategoryRepository } from "../models/category";
import {
  ITransactionRepository,
  Transaction,
  TransactionConnection,
  TransactionType,
} from "../models/transaction";
import { isDateString, toDateString } from "../types/date";
import { MAX_PAGE_SIZE } from "../types/pagination";
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

function buildTransactionConnection(input?: {
  endCursor?: string;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  transactions?: Transaction[];
}): TransactionConnection {
  return {
    edges:
      input?.transactions?.map((transaction) => ({
        node: transaction,
        cursor: "cursor",
      })) || [],
    pageInfo: {
      hasNextPage: input?.hasNextPage ?? false,
      hasPreviousPage: input?.hasPreviousPage ?? false,
      endCursor: input?.endCursor,
    },
    totalCount: input?.transactions?.length || 0,
  };
}

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
      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        buildTransactionConnection(),
      );

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
      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        buildTransactionConnection(),
      );

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
      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        buildTransactionConnection(),
      );

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
      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        buildTransactionConnection(),
      );

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
      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        buildTransactionConnection(),
      );

      // Act
      const result = await service.getCategories(userId, EntityScope.ALL);

      // Assert
      expect(result).toEqual([]);
    });

    it("should return recentDescriptions as empty array when no transactions exist", async () => {
      // Arrange
      const category = fakeCategory({ isArchived: false });
      mockCategoryRepository.findAllByUserId.mockResolvedValue([category]);
      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        buildTransactionConnection(),
      );

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
        buildTransactionConnection({
          transactions: transactionsWithoutCategory,
        }),
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
        buildTransactionConnection({
          transactions: transactionsWithoutDescription,
        }),
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
        buildTransactionConnection({ transactions }),
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
        buildTransactionConnection({ transactions }),
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
        buildTransactionConnection({ transactions }),
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
        buildTransactionConnection({ transactions }),
      );

      // Act
      const result = await service.getCategories(userId, EntityScope.ACTIVE);

      // Assert - should only see unique descriptions
      expect(result[0].recentDescriptions).toEqual(["ice cream", "milk"]);
      expect(result[0].recentDescriptions).toHaveLength(2);
    });

    it("should paginate through all pages of transactions", async () => {
      // Arrange
      const category = fakeCategory({ isArchived: false });
      mockCategoryRepository.findAllByUserId.mockResolvedValue([category]);

      // Create transactions for multiple pages
      const page1Transactions = Array.from({ length: 3 }, (_, index) =>
        fakeTransaction({
          categoryId: category.id,
          description: `page1-desc${index}`,
        }),
      );

      const page2Transactions = Array.from({ length: 2 }, (_, index) =>
        fakeTransaction({
          categoryId: category.id,
          description: `page2-desc${index}`,
        }),
      );

      // Mock multiple pages: first call returns page 1 with hasNextPage=true,
      // second call returns page 2 with hasNextPage=false
      mockTransactionRepository.findActiveByUserId
        .mockResolvedValueOnce(
          buildTransactionConnection({
            transactions: page1Transactions,
            hasNextPage: true,
            endCursor: "cursor-page-1",
          }),
        )
        .mockResolvedValueOnce(
          buildTransactionConnection({
            transactions: page2Transactions,
            hasNextPage: false,
          }),
        );

      // Act
      const result = await service.getCategories(userId, EntityScope.ACTIVE);

      // Assert
      // Should have descriptions from both pages
      expect(result[0].recentDescriptions).toHaveLength(5); // 3 from page1 + 2 from page 2
      expect(result[0].recentDescriptions).toContain("page1-desc0");
      expect(result[0].recentDescriptions).toContain("page2-desc0");

      // Verify pagination was called twice with correct parameters
      expect(
        mockTransactionRepository.findActiveByUserId,
      ).toHaveBeenCalledTimes(2);

      // Extract filters from both calls
      const call1Filters =
        mockTransactionRepository.findActiveByUserId.mock.calls[0][2];
      const call2Filters =
        mockTransactionRepository.findActiveByUserId.mock.calls[1][2];

      // Verify date filters are the same on both calls
      expect(call1Filters?.dateAfter).toBe(call2Filters?.dateAfter);
      expect(call1Filters?.dateBefore).toBe(call2Filters?.dateBefore);

      // Verify date filters are valid DateString format (YYYY-MM-DD)
      expect(isDateString(call1Filters?.dateAfter || "")).toBe(true);
      expect(isDateString(call1Filters?.dateBefore || "")).toBe(true);

      // Verify lookback is approximately CATEGORY_HISTORY_LOOKBACK_DAYS days (allow 1 day variance for execution time)
      const dateAfter = new Date(call1Filters?.dateAfter || "");
      const dateBefore = new Date(call1Filters?.dateBefore || "");
      const daysDiff = daysBetween(dateAfter, dateBefore);
      expect(daysDiff).toBeGreaterThanOrEqual(
        CATEGORY_HISTORY_LOOKBACK_DAYS - 1,
      );
      expect(daysDiff).toBeLessThanOrEqual(CATEGORY_HISTORY_LOOKBACK_DAYS);

      // First call with no cursor
      expect(
        mockTransactionRepository.findActiveByUserId,
      ).toHaveBeenNthCalledWith(
        1,
        userId,
        { first: MAX_PAGE_SIZE, after: undefined },
        call1Filters,
      );
      // Second call with cursor from first page
      expect(
        mockTransactionRepository.findActiveByUserId,
      ).toHaveBeenNthCalledWith(
        2,
        userId,
        { first: MAX_PAGE_SIZE, after: "cursor-page-1" },
        call2Filters,
      );
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
        buildTransactionConnection({ transactions }),
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
        { first: MAX_PAGE_SIZE, after: undefined },
        { dateAfter: "2024-01-01", dateBefore: "2024-01-31" },
      );
    });

    it("should support categoryId filter", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        buildTransactionConnection(),
      );

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
        { first: MAX_PAGE_SIZE, after: undefined },
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
      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        buildTransactionConnection(),
      );

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
        { first: MAX_PAGE_SIZE, after: undefined },
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
      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        buildTransactionConnection(),
      );

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
        { first: MAX_PAGE_SIZE, after: undefined },
        {
          dateAfter: "2024-01-01",
          dateBefore: "2024-01-31",
          categoryIds: [categoryId],
          accountIds: [accountId],
        },
      );
    });

    it("should paginate through all pages and collect all results", async () => {
      // Arrange
      const page1Transactions = [fakeTransaction(), fakeTransaction()];
      const page2Transactions = [fakeTransaction()];

      const page1Connection = buildTransactionConnection({
        endCursor: "cursor1",
        hasNextPage: true,
        hasPreviousPage: false,
        transactions: page1Transactions,
      });

      const page2Connection = buildTransactionConnection({
        endCursor: "cursor2",
        hasNextPage: false,
        hasPreviousPage: true,
        transactions: page2Transactions,
      });

      mockTransactionRepository.findActiveByUserId
        .mockResolvedValueOnce(page1Connection)
        .mockResolvedValueOnce(page2Connection);

      // Act
      const result = await service.getFilteredTransactions(
        userId,
        toDateString("2024-01-01"),
        toDateString("2024-01-31"),
      );

      // Assert
      expect(result).toHaveLength(3);
      expect(
        mockTransactionRepository.findActiveByUserId,
      ).toHaveBeenCalledTimes(2);

      expect(
        mockTransactionRepository.findActiveByUserId,
      ).toHaveBeenNthCalledWith(
        1,
        userId,
        { first: MAX_PAGE_SIZE, after: undefined },
        { dateAfter: "2024-01-01", dateBefore: "2024-01-31" },
      );

      expect(
        mockTransactionRepository.findActiveByUserId,
      ).toHaveBeenNthCalledWith(
        2,
        userId,
        { first: MAX_PAGE_SIZE, after: "cursor1" },
        { dateAfter: "2024-01-01", dateBefore: "2024-01-31" },
      );
    });
  });
});
