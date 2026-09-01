import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { TransactionType } from "../models/transaction";
import { CategoryRepository } from "../ports/category-repository";
import { TransactionRepository } from "../ports/transaction-repository";
import { toDateString } from "../types/date-string";
import { fakeCategory } from "../utils/test-utils/models/category-fakes";
import { fakeTransaction } from "../utils/test-utils/models/transaction-fakes";
import { createMockCategoryRepository } from "../utils/test-utils/repositories/category-repository-mocks";
import { createMockTransactionRepository } from "../utils/test-utils/repositories/transaction-repository-mocks";
import { AggregateTransactionsServiceImpl } from "./aggregate-transactions-service";

describe("AggregateTransactionsService", () => {
  let transactionRepository: Mocked<TransactionRepository>;
  let categoryRepository: Mocked<CategoryRepository>;
  let service: AggregateTransactionsServiceImpl;

  const userId = faker.string.uuid();

  beforeEach(() => {
    transactionRepository = createMockTransactionRepository();
    categoryRepository = createMockCategoryRepository();

    service = new AggregateTransactionsServiceImpl(
      transactionRepository,
      categoryRepository,
    );
  });

  describe("call", () => {
    // Happy path

    it("sums, counts, and finds min/max per type/currency combination", async () => {
      // Arrange
      transactionRepository.findManyByUserId.mockResolvedValue([
        fakeTransaction({
          type: TransactionType.EXPENSE,
          currency: "USD",
          amount: 12,
        }),
        fakeTransaction({
          type: TransactionType.EXPENSE,
          currency: "USD",
          amount: 220,
        }),
        fakeTransaction({
          type: TransactionType.INCOME,
          currency: "USD",
          amount: 3000,
        }),
      ]);

      // Act
      const result = await service.call({
        userId,
        startDate: toDateString("2000-01-01"),
        endDate: toDateString("2000-01-31"),
        includeTransactionsExcludedFromReports: true,
      });

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.arrayContaining([
          {
            type: TransactionType.EXPENSE,
            currency: "USD",
            sum: 232,
            count: 2,
            min: 12,
            max: 220,
          },
          {
            type: TransactionType.INCOME,
            currency: "USD",
            sum: 3000,
            count: 1,
            min: 3000,
            max: 3000,
          },
        ]),
      });
      expect((result as { data: unknown[] }).data).toHaveLength(2);
    });

    it("splits results by currency within same type", async () => {
      // Arrange
      transactionRepository.findManyByUserId.mockResolvedValue([
        fakeTransaction({
          type: TransactionType.EXPENSE,
          currency: "USD",
          amount: 100,
        }),
        fakeTransaction({
          type: TransactionType.EXPENSE,
          currency: "EUR",
          amount: 50,
        }),
      ]);

      // Act
      const result = await service.call({
        userId,
        startDate: toDateString("2000-01-01"),
        endDate: toDateString("2000-01-31"),
        includeTransactionsExcludedFromReports: true,
      });

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ currency: "USD", sum: 100 }),
          expect.objectContaining({ currency: "EUR", sum: 50 }),
        ]),
      });
    });

    it("groups results by account when groupBy is ACCOUNT", async () => {
      // Arrange
      const accountId1 = faker.string.uuid();
      const accountId2 = faker.string.uuid();
      transactionRepository.findManyByUserId.mockResolvedValue([
        fakeTransaction({
          type: TransactionType.EXPENSE,
          currency: "USD",
          accountId: accountId1,
          amount: 15,
        }),
        fakeTransaction({
          type: TransactionType.EXPENSE,
          currency: "USD",
          accountId: accountId1,
          amount: 200,
        }),
        fakeTransaction({
          type: TransactionType.EXPENSE,
          currency: "USD",
          accountId: accountId2,
          amount: 40,
        }),
      ]);

      // Act
      const result = await service.call({
        userId,
        startDate: toDateString("2000-01-01"),
        endDate: toDateString("2000-01-31"),
        includeTransactionsExcludedFromReports: true,
        groupBy: "ACCOUNT",
      });

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.arrayContaining([
          {
            type: TransactionType.EXPENSE,
            currency: "USD",
            accountId: accountId1,
            sum: 215,
            count: 2,
            min: 15,
            max: 200,
          },
          {
            type: TransactionType.EXPENSE,
            currency: "USD",
            accountId: accountId2,
            sum: 40,
            count: 1,
            min: 40,
            max: 40,
          },
        ]),
      });
    });

    it("groups results by category when groupBy is CATEGORY, including null bucket for uncategorized", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      transactionRepository.findManyByUserId.mockResolvedValue([
        fakeTransaction({
          type: TransactionType.EXPENSE,
          currency: "USD",
          categoryId,
          amount: 14,
        }),
        fakeTransaction({
          type: TransactionType.EXPENSE,
          currency: "USD",
          categoryId: undefined,
          amount: 20,
        }),
      ]);

      // Act
      const result = await service.call({
        userId,
        startDate: toDateString("2000-01-01"),
        endDate: toDateString("2000-01-31"),
        includeTransactionsExcludedFromReports: true,
        groupBy: "CATEGORY",
      });

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.arrayContaining([
          {
            type: TransactionType.EXPENSE,
            currency: "USD",
            categoryId,
            sum: 14,
            count: 1,
            min: 14,
            max: 14,
          },
          {
            type: TransactionType.EXPENSE,
            currency: "USD",
            categoryId: null,
            sum: 20,
            count: 1,
            min: 20,
            max: 20,
          },
        ]),
      });
    });

    it("groups results by month when groupBy is MONTH", async () => {
      // Arrange
      transactionRepository.findManyByUserId.mockResolvedValue([
        fakeTransaction({
          type: TransactionType.EXPENSE,
          currency: "USD",
          date: toDateString("2000-01-10"),
          amount: 12,
        }),
        fakeTransaction({
          type: TransactionType.EXPENSE,
          currency: "USD",
          date: toDateString("2000-02-05"),
          amount: 15,
        }),
      ]);

      // Act
      const result = await service.call({
        userId,
        startDate: toDateString("2000-01-01"),
        endDate: toDateString("2000-02-28"),
        includeTransactionsExcludedFromReports: true,
        groupBy: "MONTH",
      });

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.arrayContaining([
          {
            type: TransactionType.EXPENSE,
            currency: "USD",
            month: "2000-01",
            sum: 12,
            count: 1,
            min: 12,
            max: 12,
          },
          {
            type: TransactionType.EXPENSE,
            currency: "USD",
            month: "2000-02",
            sum: 15,
            count: 1,
            min: 15,
            max: 15,
          },
        ]),
      });
    });

    it("omits combinations with no matching transactions", async () => {
      // Arrange
      transactionRepository.findManyByUserId.mockResolvedValue([]);

      // Act
      const result = await service.call({
        userId,
        startDate: toDateString("2000-01-01"),
        endDate: toDateString("2000-01-31"),
        includeTransactionsExcludedFromReports: true,
      });

      // Assert
      expect(result).toEqual({
        success: true,
        data: [],
      });
    });

    it("calls repository with date range only when no optional filters given", async () => {
      // Arrange
      transactionRepository.findManyByUserId.mockResolvedValue([]);

      // Act
      await service.call({
        userId,
        startDate: toDateString("2000-01-01"),
        endDate: toDateString("2000-01-31"),
        includeTransactionsExcludedFromReports: true,
      });

      // Assert
      expect(transactionRepository.findManyByUserId).toHaveBeenCalledWith(
        userId,
        {
          dateAfter: toDateString("2000-01-01"),
          dateBefore: toDateString("2000-01-31"),
        },
      );
    });

    it("calls repository with accountIds, categoryIds, includeUncategorized, and types when provided", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const categoryId = faker.string.uuid();
      transactionRepository.findManyByUserId.mockResolvedValue([]);

      // Act
      await service.call({
        userId,
        startDate: toDateString("2000-01-01"),
        endDate: toDateString("2000-01-31"),
        includeTransactionsExcludedFromReports: true,
        accountIds: [accountId],
        categoryIds: [categoryId],
        includeUncategorized: true,
        types: [TransactionType.EXPENSE],
      });

      // Assert
      expect(transactionRepository.findManyByUserId).toHaveBeenCalledWith(
        userId,
        {
          dateAfter: toDateString("2000-01-01"),
          dateBefore: toDateString("2000-01-31"),
          accountIds: [accountId],
          categoryIds: [categoryId],
          includeUncategorized: true,
          types: [TransactionType.EXPENSE],
        },
      );
    });

    it("drops transactions linked to excludeFromReports category when includeTransactionsExcludedFromReports is false", async () => {
      // Arrange
      const excludedCategory = fakeCategory({ excludeFromReports: true });
      const includedCategory = fakeCategory({ excludeFromReports: false });
      categoryRepository.findManyWithArchivedByUserId.mockResolvedValue([
        excludedCategory,
        includedCategory,
      ]);
      transactionRepository.findManyByUserId.mockResolvedValue([
        fakeTransaction({
          type: TransactionType.EXPENSE,
          currency: "USD",
          categoryId: includedCategory.id,
          amount: 10,
        }),
        fakeTransaction({
          type: TransactionType.EXPENSE,
          currency: "USD",
          categoryId: excludedCategory.id,
          amount: 900,
        }),
      ]);

      // Act
      const result = await service.call({
        userId,
        startDate: toDateString("2000-01-01"),
        endDate: toDateString("2000-01-31"),
        includeTransactionsExcludedFromReports: false,
      });

      // Assert
      expect(result).toEqual({
        success: true,
        data: [expect.objectContaining({ sum: 10, count: 1 })],
      });
    });

    it("skips category lookup entirely when includeTransactionsExcludedFromReports is true", async () => {
      // Arrange
      transactionRepository.findManyByUserId.mockResolvedValue([]);

      // Act
      await service.call({
        userId,
        startDate: toDateString("2000-01-01"),
        endDate: toDateString("2000-01-31"),
        includeTransactionsExcludedFromReports: true,
      });

      // Assert
      expect(
        categoryRepository.findManyWithArchivedByUserId,
      ).not.toHaveBeenCalled();
    });

    // Validation failures

    it("returns failure when startDate is after endDate", async () => {
      // Act
      const result = await service.call({
        userId,
        startDate: toDateString("2000-01-31"),
        endDate: toDateString("2000-01-01"),
        includeTransactionsExcludedFromReports: true,
      });

      // Assert
      expect(result).toEqual({
        success: false,
        error: "startDate must not be after endDate",
      });
      expect(transactionRepository.findManyByUserId).not.toHaveBeenCalled();
    });

    it("returns failure when date range exceeds 365 days", async () => {
      // Act
      const result = await service.call({
        userId,
        startDate: toDateString("2000-01-01"),
        endDate: toDateString("2001-01-02"),
        includeTransactionsExcludedFromReports: true,
      });

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Date range must not exceed 365 days",
      });
      expect(transactionRepository.findManyByUserId).not.toHaveBeenCalled();
    });

    it("returns failure when categoryIds names category excluded from reports while includeTransactionsExcludedFromReports is false", async () => {
      // Arrange
      const excludedCategory = fakeCategory({ excludeFromReports: true });
      categoryRepository.findManyWithArchivedByUserId.mockResolvedValue([
        excludedCategory,
      ]);

      // Act
      const result = await service.call({
        userId,
        startDate: toDateString("2000-01-01"),
        endDate: toDateString("2000-01-31"),
        includeTransactionsExcludedFromReports: false,
        categoryIds: [excludedCategory.id],
      });

      // Assert
      expect(result).toEqual({
        success: false,
        error: expect.any(String),
      });
      expect(transactionRepository.findManyByUserId).not.toHaveBeenCalled();
    });

    // Dependency failures

    it("propagates error when repository throws", async () => {
      // Arrange
      const errorMessage = faker.lorem.sentence();
      transactionRepository.findManyByUserId.mockRejectedValue(
        new Error(errorMessage),
      );

      // Act
      const promise = service.call({
        userId,
        startDate: toDateString("2000-01-01"),
        endDate: toDateString("2000-01-31"),
        includeTransactionsExcludedFromReports: true,
      });

      // Assert
      await expect(promise).rejects.toThrow(errorMessage);
    });
  });
});
