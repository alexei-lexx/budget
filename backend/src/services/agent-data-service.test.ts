import { faker } from "@faker-js/faker";
import { IAccountRepository } from "../models/account";
import { CategoryType, ICategoryRepository } from "../models/category";
import {
  ITransactionRepository,
  Transaction,
  TransactionConnection,
  TransactionType,
} from "../models/transaction";
import { toDateString } from "../types/date";
import { MAX_PAGE_SIZE } from "../types/pagination";
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
import { AgentDataService, EntityScope } from "./agent-data-service";

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

      // Act
      const result = await service.getCategories(userId, EntityScope.ALL);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: mockCategories[0].id,
        name: "Groceries",
        type: CategoryType.EXPENSE,
        isArchived: false,
      });
      expect(result[1]).toEqual({
        id: mockCategories[1].id,
        name: "Salary",
        type: CategoryType.INCOME,
        isArchived: true,
      });
      expect(mockCategoryRepository.findAllByUserId).toHaveBeenCalledWith(
        userId,
      );
    });

    it("should return empty array when user has no categories", async () => {
      // Arrange
      mockCategoryRepository.findAllByUserId.mockResolvedValue([]);

      // Act
      const result = await service.getCategories(userId, EntityScope.ALL);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("getFilteredTransactions", () => {
    const buildConnection = (input?: {
      endCursor?: string;
      hasNextPage?: boolean;
      hasPreviousPage?: boolean;
      transactions?: Transaction[];
    }): TransactionConnection => ({
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
    });

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
        buildConnection({ transactions }),
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
        buildConnection(),
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
        buildConnection(),
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
        buildConnection(),
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

      const page1Connection = buildConnection({
        endCursor: "cursor1",
        hasNextPage: true,
        hasPreviousPage: false,
        transactions: page1Transactions,
      });

      const page2Connection = buildConnection({
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
