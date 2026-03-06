import { faker } from "@faker-js/faker";
import { IAccountRepository } from "../models/account";
import { CategoryType, ICategoryRepository } from "../models/category";
import { ITransactionRepository, TransactionType } from "../models/transaction";
import { toDateString } from "../types/date";
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
          name: "Food",
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
        name: "Food",
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
    const accountId1 = faker.string.uuid();
    const accountId2 = faker.string.uuid();
    const categoryId1 = faker.string.uuid();
    const categoryId2 = faker.string.uuid();

    const mockTransactions = [
      fakeTransaction({
        userId,
        id: faker.string.uuid(),
        accountId: accountId1,
        categoryId: categoryId1,
        type: TransactionType.EXPENSE,
        amount: 50,
        currency: "USD",
        date: toDateString("2024-01-15"),
        description: "Groceries",
        isArchived: false,
      }),
      fakeTransaction({
        userId,
        id: faker.string.uuid(),
        accountId: accountId2,
        categoryId: categoryId2,
        type: TransactionType.INCOME,
        amount: 1000,
        currency: "USD",
        date: toDateString("2024-01-20"),
        description: "Salary",
        isArchived: false,
      }),
      fakeTransaction({
        userId,
        id: faker.string.uuid(),
        accountId: accountId1,
        categoryId: categoryId1,
        type: TransactionType.EXPENSE,
        amount: 30,
        currency: "USD",
        date: toDateString("2024-01-25"),
        description: "Transport",
        isArchived: false,
      }),
    ];

    it("should return all transactions when no filters are provided", async () => {
      // Arrange
      mockTransactionRepository.findActiveByDateRange.mockResolvedValue(
        mockTransactions,
      );

      // Act
      const result = await service.getFilteredTransactions(
        userId,
        toDateString("2024-01-01"),
        toDateString("2024-01-31"),
      );

      // Assert
      expect(
        mockTransactionRepository.findActiveByDateRange,
      ).toHaveBeenCalledWith(userId, "2024-01-01", "2024-01-31");
      expect(result).toHaveLength(3);
    });

    it("should filter transactions by categoryId", async () => {
      // Arrange
      mockTransactionRepository.findActiveByDateRange.mockResolvedValue(
        mockTransactions,
      );

      // Act
      const result = await service.getFilteredTransactions(
        userId,
        toDateString("2024-01-01"),
        toDateString("2024-01-31"),
        categoryId1,
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]?.categoryId).toBe(categoryId1);
      expect(result[1]?.categoryId).toBe(categoryId1);
    });

    it("should filter transactions by accountId", async () => {
      // Arrange
      mockTransactionRepository.findActiveByDateRange.mockResolvedValue(
        mockTransactions,
      );

      // Act
      const result = await service.getFilteredTransactions(
        userId,
        toDateString("2024-01-01"),
        toDateString("2024-01-31"),
        undefined,
        accountId1,
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]?.accountId).toBe(accountId1);
      expect(result[1]?.accountId).toBe(accountId1);
    });

    it("should filter transactions by both categoryId and accountId", async () => {
      // Arrange
      mockTransactionRepository.findActiveByDateRange.mockResolvedValue(
        mockTransactions,
      );

      // Act
      const result = await service.getFilteredTransactions(
        userId,
        toDateString("2024-01-01"),
        toDateString("2024-01-31"),
        categoryId1,
        accountId1,
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]?.categoryId).toBe(categoryId1);
      expect(result[0]?.accountId).toBe(accountId1);
      expect(result[1]?.categoryId).toBe(categoryId1);
      expect(result[1]?.accountId).toBe(accountId1);
    });

    it("should return empty array when no transactions match filters", async () => {
      // Arrange
      mockTransactionRepository.findActiveByDateRange.mockResolvedValue(
        mockTransactions,
      );

      // Act
      const result = await service.getFilteredTransactions(
        userId,
        toDateString("2024-01-01"),
        toDateString("2024-01-31"),
        "nonexistent-category-id",
      );

      // Assert
      expect(result).toEqual([]);
    });

    it("should return plain transaction objects with required fields", async () => {
      // Arrange
      mockTransactionRepository.findActiveByDateRange.mockResolvedValue([
        mockTransactions[0],
      ]);

      // Act
      const result = await service.getFilteredTransactions(
        userId,
        toDateString("2024-01-01"),
        toDateString("2024-01-31"),
      );

      // Assert
      expect(result[0]).toEqual({
        id: mockTransactions[0].id,
        accountId: mockTransactions[0].accountId,
        categoryId: mockTransactions[0].categoryId,
        type: mockTransactions[0].type,
        amount: mockTransactions[0].amount,
        currency: mockTransactions[0].currency,
        date: mockTransactions[0].date,
        description: mockTransactions[0].description,
        transferId: undefined,
      });
    });
  });
});
