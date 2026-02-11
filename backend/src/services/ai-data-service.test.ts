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

  describe("getAvailableAccounts", () => {
    it("should return accounts for valid userId", async () => {
      // Arrange
      const accounts = [
        fakeAccount({ userId, name: "Cash" }),
        fakeAccount({ userId, name: "Bank" }),
      ];
      mockAccountRepository.findActiveByUserId.mockResolvedValue(accounts);

      // Act
      const result = await service.getAvailableAccounts(userId);

      // Assert
      expect(result).toEqual(accounts);
      expect(mockAccountRepository.findActiveByUserId).toHaveBeenCalledWith(
        userId,
      );
    });

    it("should throw error when userId is empty", async () => {
      // Act & Assert
      const promise = service.getAvailableAccounts("");

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "User ID is required",
        code: BusinessErrorCodes.INVALID_PARAMETERS,
      });
      expect(mockAccountRepository.findActiveByUserId).not.toHaveBeenCalled();
    });

    it("should return empty array when no accounts exist", async () => {
      // Arrange
      mockAccountRepository.findActiveByUserId.mockResolvedValue([]);

      // Act
      const result = await service.getAvailableAccounts(userId);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("getAvailableCategories", () => {
    it("should return categories for valid userId", async () => {
      // Arrange
      const categories = [
        fakeCategory({ userId, name: "Food", type: CategoryType.EXPENSE }),
        fakeCategory({ userId, name: "Salary", type: CategoryType.INCOME }),
      ];
      mockCategoryRepository.findActiveByUserId.mockResolvedValue(categories);

      // Act
      const result = await service.getAvailableCategories(userId);

      // Assert
      expect(result).toEqual(categories);
      expect(mockCategoryRepository.findActiveByUserId).toHaveBeenCalledWith(
        userId,
      );
    });

    it("should throw error when userId is empty", async () => {
      // Act & Assert
      const promise = service.getAvailableCategories("");

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "User ID is required",
        code: BusinessErrorCodes.INVALID_PARAMETERS,
      });
      expect(mockCategoryRepository.findActiveByUserId).not.toHaveBeenCalled();
    });

    it("should return empty array when no categories exist", async () => {
      // Arrange
      mockCategoryRepository.findActiveByUserId.mockResolvedValue([]);

      // Act
      const result = await service.getAvailableCategories(userId);

      // Assert
      expect(result).toEqual([]);
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
      expect(result).toEqual(transactions);
      expect(
        mockTransactionRepository.findActiveByDateRange,
      ).toHaveBeenCalledWith(userId, "2000-01-01", "2000-01-31");
    });

    it("should filter transactions by accountIds", async () => {
      // Arrange
      const accountId1 = faker.string.uuid();
      const accountId2 = faker.string.uuid();
      const accountId3 = faker.string.uuid();

      const transactions = [
        fakeTransaction({ userId, accountId: accountId1 }),
        fakeTransaction({ userId, accountId: accountId2 }),
        fakeTransaction({ userId, accountId: accountId3 }),
      ];
      mockTransactionRepository.findActiveByDateRange.mockResolvedValue(
        transactions,
      );

      // Act
      const result = await service.getFilteredTransactions(
        userId,
        dateRange,
        undefined,
        [accountId1, accountId3],
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].accountId).toBe(accountId1);
      expect(result[1].accountId).toBe(accountId3);
    });

    it("should filter transactions by categoryIds", async () => {
      // Arrange
      const categoryId1 = faker.string.uuid();
      const categoryId2 = faker.string.uuid();
      const categoryId3 = faker.string.uuid();

      const transactions = [
        fakeTransaction({ userId, categoryId: categoryId1 }),
        fakeTransaction({ userId, categoryId: categoryId2 }),
        fakeTransaction({ userId, categoryId: categoryId3 }),
      ];
      mockTransactionRepository.findActiveByDateRange.mockResolvedValue(
        transactions,
      );

      // Act
      const result = await service.getFilteredTransactions(
        userId,
        dateRange,
        [categoryId1, categoryId3],
        undefined,
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].categoryId).toBe(categoryId1);
      expect(result[1].categoryId).toBe(categoryId3);
    });

    it("should filter transactions by both accountIds and categoryIds", async () => {
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
        [categoryId1],
        [accountId1, accountId2],
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].accountId).toBe(accountId1);
      expect(result[0].categoryId).toBe(categoryId1);
      expect(result[1].accountId).toBe(accountId2);
      expect(result[1].categoryId).toBe(categoryId1);
    });

    it("should exclude transactions without categoryId when filtering by categoryIds", async () => {
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
        [categoryId1],
        undefined,
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
        undefined,
        [accountId],
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

    it("should handle empty accountIds array as no filter", async () => {
      // Arrange
      const transactions = [
        fakeTransaction({ userId }),
        fakeTransaction({ userId }),
      ];
      mockTransactionRepository.findActiveByDateRange.mockResolvedValue(
        transactions,
      );

      // Act
      const result = await service.getFilteredTransactions(
        userId,
        dateRange,
        undefined,
        [],
      );

      // Assert
      expect(result).toEqual(transactions);
    });

    it("should handle empty categoryIds array as no filter", async () => {
      // Arrange
      const transactions = [
        fakeTransaction({ userId }),
        fakeTransaction({ userId }),
      ];
      mockTransactionRepository.findActiveByDateRange.mockResolvedValue(
        transactions,
      );

      // Act
      const result = await service.getFilteredTransactions(
        userId,
        dateRange,
        [],
        undefined,
      );

      // Assert
      expect(result).toEqual(transactions);
    });
  });
});
