import { faker } from "@faker-js/faker";
import {
  fakeAccount,
  fakeCategory,
  fakeTransaction,
} from "../__tests__/utils/factories";
import {
  createMockAccountRepository,
  createMockCategoryRepository,
  createMockTransactionRepository,
} from "../__tests__/utils/mock-repositories";
import { IAccountRepository } from "../models/account";
import { CategoryType, ICategoryRepository } from "../models/category";
import { ITransactionRepository } from "../models/transaction";
import { AiDataService } from "./ai-data-service";
import { BusinessError, BusinessErrorCodes } from "./business-error";

describe("AiDataService", () => {
  let service: AiDataService;
  let userId: string;
  let mockAccountRepository: jest.Mocked<IAccountRepository>;
  let mockCategoryRepository: jest.Mocked<ICategoryRepository>;
  let mockTransactionRepository: jest.Mocked<ITransactionRepository>;

  beforeEach(() => {
    mockAccountRepository = createMockAccountRepository();
    mockCategoryRepository = createMockCategoryRepository();
    mockTransactionRepository = createMockTransactionRepository();

    service = new AiDataService(
      mockAccountRepository,
      mockCategoryRepository,
      mockTransactionRepository,
    );

    userId = faker.string.uuid();

    jest.clearAllMocks();
  });

  describe("getAllAccounts", () => {
    it("should return accounts for valid userId", async () => {
      // Arrange
      const accounts = [
        fakeAccount({ userId, name: "Cash", currency: "USD" }),
        fakeAccount({ userId, name: "Bank", currency: "EUR" }),
      ];
      mockAccountRepository.findAllByUserId.mockResolvedValue(accounts);

      // Act
      const result = await service.getAllAccounts(userId);

      // Assert
      expect(result).toEqual([
        {
          id: accounts[0].id,
          name: "Cash",
          currency: "USD",
          isArchived: false,
        },
        {
          id: accounts[1].id,
          name: "Bank",
          currency: "EUR",
          isArchived: false,
        },
      ]);
      expect(mockAccountRepository.findAllByUserId).toHaveBeenCalledWith(
        userId,
      );
    });

    it("should throw error when userId is empty", async () => {
      // Act & Assert
      const promise = service.getAllAccounts("");

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "User ID is required",
        code: BusinessErrorCodes.INVALID_PARAMETERS,
      });
      expect(mockAccountRepository.findAllByUserId).not.toHaveBeenCalled();
    });

    it("should return empty array when no accounts exist", async () => {
      // Arrange
      mockAccountRepository.findAllByUserId.mockResolvedValue([]);

      // Act
      const result = await service.getAllAccounts(userId);

      // Assert
      expect(result).toEqual([]);
    });

    it("should include archived accounts", async () => {
      // Arrange
      const accounts = [
        fakeAccount({
          userId,
          name: "Cash",
          currency: "USD",
          isArchived: false,
        }),
        fakeAccount({
          userId,
          name: "Old Account",
          currency: "EUR",
          isArchived: true,
        }),
      ];
      mockAccountRepository.findAllByUserId.mockResolvedValue(accounts);

      // Act
      const result = await service.getAllAccounts(userId);

      // Assert
      expect(result).toEqual([
        {
          id: accounts[0].id,
          name: "Cash",
          currency: "USD",
          isArchived: false,
        },
        {
          id: accounts[1].id,
          name: "Old Account",
          currency: "EUR",
          isArchived: true,
        },
      ]);
      expect(result[1].isArchived).toBe(true);
    });
  });

  describe("getAllCategories", () => {
    it("should return categories for valid userId", async () => {
      // Arrange
      const categories = [
        fakeCategory({ userId, name: "Food", type: CategoryType.EXPENSE }),
        fakeCategory({ userId, name: "Salary", type: CategoryType.INCOME }),
      ];
      mockCategoryRepository.findAllByUserId.mockResolvedValue(categories);

      // Act
      const result = await service.getAllCategories(userId);

      // Assert
      expect(result).toEqual([
        {
          id: categories[0].id,
          name: "Food",
          type: CategoryType.EXPENSE,
          isArchived: false,
        },
        {
          id: categories[1].id,
          name: "Salary",
          type: CategoryType.INCOME,
          isArchived: false,
        },
      ]);
      expect(mockCategoryRepository.findAllByUserId).toHaveBeenCalledWith(
        userId,
      );
    });

    it("should throw error when userId is empty", async () => {
      // Act & Assert
      const promise = service.getAllCategories("");

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "User ID is required",
        code: BusinessErrorCodes.INVALID_PARAMETERS,
      });
      expect(mockCategoryRepository.findAllByUserId).not.toHaveBeenCalled();
    });

    it("should return empty array when no categories exist", async () => {
      // Arrange
      mockCategoryRepository.findAllByUserId.mockResolvedValue([]);

      // Act
      const result = await service.getAllCategories(userId);

      // Assert
      expect(result).toEqual([]);
    });

    it("should include archived categories", async () => {
      // Arrange
      const categories = [
        fakeCategory({
          userId,
          name: "Food",
          type: CategoryType.EXPENSE,
          isArchived: false,
        }),
        fakeCategory({
          userId,
          name: "Old Category",
          type: CategoryType.INCOME,
          isArchived: true,
        }),
      ];
      mockCategoryRepository.findAllByUserId.mockResolvedValue(categories);

      // Act
      const result = await service.getAllCategories(userId);

      // Assert
      expect(result).toEqual([
        {
          id: categories[0].id,
          name: "Food",
          type: CategoryType.EXPENSE,
          isArchived: false,
        },
        {
          id: categories[1].id,
          name: "Old Category",
          type: CategoryType.INCOME,
          isArchived: true,
        },
      ]);
      expect(result[1].isArchived).toBe(true);
    });
  });

  describe("getFilteredTransactions", () => {
    const dateRange = { startDate: "2000-01-01", endDate: "2000-01-31" };

    it("should return all transactions when no filters provided", async () => {
      // Arrange
      const transactions = [
        fakeTransaction({ userId, date: "2000-01-15" }),
        fakeTransaction({ userId, date: "2000-01-20" }),
      ];
      mockTransactionRepository.findActiveByDateRange.mockResolvedValue(
        transactions,
      );

      // Act
      const result = await service.getFilteredTransactions(
        userId,
        dateRange,
        undefined,
        undefined,
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: transactions[0].id,
        accountId: transactions[0].accountId,
        categoryId: transactions[0].categoryId ?? null,
        type: transactions[0].type,
        amount: transactions[0].amount,
        currency: transactions[0].currency,
        date: transactions[0].date,
        description: transactions[0].description ?? "",
        transferId: transactions[0].transferId ?? null,
      });
      expect(
        mockTransactionRepository.findActiveByDateRange,
      ).toHaveBeenCalledWith(userId, "2000-01-01", "2000-01-31");
    });

    it("should filter transactions by accountId", async () => {
      // Arrange
      const accountId1 = faker.string.uuid();
      const accountId2 = faker.string.uuid();

      const transactions = [
        fakeTransaction({ userId, accountId: accountId1 }),
        fakeTransaction({ userId, accountId: accountId2 }),
        fakeTransaction({ userId, accountId: accountId1 }),
      ];
      mockTransactionRepository.findActiveByDateRange.mockResolvedValue(
        transactions,
      );

      // Act
      const result = await service.getFilteredTransactions(
        userId,
        dateRange,
        accountId1,
        undefined,
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].accountId).toBe(accountId1);
      expect(result[1].accountId).toBe(accountId1);
    });

    it("should filter transactions by categoryId", async () => {
      // Arrange
      const categoryId1 = faker.string.uuid();
      const categoryId2 = faker.string.uuid();

      const transactions = [
        fakeTransaction({ userId, categoryId: categoryId1 }),
        fakeTransaction({ userId, categoryId: categoryId2 }),
        fakeTransaction({ userId, categoryId: categoryId1 }),
      ];
      mockTransactionRepository.findActiveByDateRange.mockResolvedValue(
        transactions,
      );

      // Act
      const result = await service.getFilteredTransactions(
        userId,
        dateRange,
        undefined,
        categoryId1,
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].categoryId).toBe(categoryId1);
      expect(result[1].categoryId).toBe(categoryId1);
    });

    it("should filter transactions by both accountId and categoryId", async () => {
      // Arrange
      const accountId1 = faker.string.uuid();
      const accountId2 = faker.string.uuid();
      const categoryId1 = faker.string.uuid();
      const categoryId2 = faker.string.uuid();

      const transactions = [
        fakeTransaction({
          userId,
          accountId: accountId1,
          categoryId: categoryId1,
        }),
        fakeTransaction({
          userId,
          accountId: accountId1,
          categoryId: categoryId2,
        }),
        fakeTransaction({
          userId,
          accountId: accountId2,
          categoryId: categoryId1,
        }),
        fakeTransaction({
          userId,
          accountId: accountId2,
          categoryId: categoryId2,
        }),
      ];
      mockTransactionRepository.findActiveByDateRange.mockResolvedValue(
        transactions,
      );

      // Act
      const result = await service.getFilteredTransactions(
        userId,
        dateRange,
        accountId1,
        categoryId1,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].accountId).toBe(accountId1);
      expect(result[0].categoryId).toBe(categoryId1);
    });

    it("should exclude transactions without categoryId when filtering by categoryId", async () => {
      // Arrange
      const categoryId1 = faker.string.uuid();

      const transactions = [
        fakeTransaction({ userId, categoryId: categoryId1 }),
        fakeTransaction({ userId, categoryId: undefined }),
      ];
      mockTransactionRepository.findActiveByDateRange.mockResolvedValue(
        transactions,
      );

      // Act
      const result = await service.getFilteredTransactions(
        userId,
        dateRange,
        undefined,
        categoryId1,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].categoryId).toBe(categoryId1);
    });

    it("should return empty array when no transactions match filters", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const differentAccountId = faker.string.uuid();

      const transactions = [
        fakeTransaction({ userId, accountId: differentAccountId }),
      ];
      mockTransactionRepository.findActiveByDateRange.mockResolvedValue(
        transactions,
      );

      // Act
      const result = await service.getFilteredTransactions(
        userId,
        dateRange,
        accountId,
        undefined,
      );

      // Assert
      expect(result).toEqual([]);
    });

    it("should throw error when userId is empty", async () => {
      // Act & Assert
      const promise = service.getFilteredTransactions("", dateRange);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "User ID is required",
        code: BusinessErrorCodes.INVALID_PARAMETERS,
      });
      expect(
        mockTransactionRepository.findActiveByDateRange,
      ).not.toHaveBeenCalled();
    });

    it("should throw error when startDate is missing", async () => {
      // Act & Assert
      const promise = service.getFilteredTransactions(userId, {
        startDate: "",
        endDate: "2000-01-31",
      });

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Start date and end date are required",
        code: BusinessErrorCodes.INVALID_PARAMETERS,
      });
    });

    it("should throw error when endDate is missing", async () => {
      // Act & Assert
      const promise = service.getFilteredTransactions(userId, {
        startDate: "2000-01-01",
        endDate: "",
      });

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Start date and end date are required",
        code: BusinessErrorCodes.INVALID_PARAMETERS,
      });
    });
  });
});
