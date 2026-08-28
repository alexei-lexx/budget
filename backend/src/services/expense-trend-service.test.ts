import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it, vi } from "vitest";
import { TransactionType } from "../models/transaction";
import { CategoryRepository } from "../ports/category-repository";
import { TransactionRepository } from "../ports/transaction-repository";
import { toDateString } from "../types/date-string";
import * as medianModule from "../utils/median";
import { fakeCategory } from "../utils/test-utils/models/category-fakes";
import {
  fakeExpense,
  fakeRefund,
} from "../utils/test-utils/models/transaction-fakes";
import { createMockCategoryRepository } from "../utils/test-utils/repositories/category-repository-mocks";
import { createMockTransactionRepository } from "../utils/test-utils/repositories/transaction-repository-mocks";
import { ExpenseTrendService } from "./expense-trend-service";

describe("ExpenseTrendService", () => {
  let transactionRepository: Mocked<TransactionRepository>;
  let categoryRepository: Mocked<CategoryRepository>;
  let service: ExpenseTrendService;

  const userId = faker.string.uuid();

  beforeEach(() => {
    transactionRepository = createMockTransactionRepository();
    categoryRepository = createMockCategoryRepository();

    service = new ExpenseTrendService(
      transactionRepository,
      categoryRepository,
    );
  });

  describe("call", () => {
    // Happy path

    it("does not call categoryRepository when no transactions are found", async () => {
      // Arrange
      // No transactions and no categories
      transactionRepository.findManyByUserId.mockResolvedValue([]);

      // Act
      const result = await service.call({
        userId,
        periodUnit: "MONTH",
        lookback: 3,
        currency: "EUR",
        today: toDateString("2000-04-01"),
      });

      // Assert
      expect(result.success).toBe(true);

      expect(transactionRepository.findManyByUserId).toHaveBeenCalledWith(
        userId,
        {
          currencies: ["EUR"],
          dateAfter: "2000-01-01",
          dateBefore: "2000-04-01",
          types: [TransactionType.EXPENSE, TransactionType.REFUND],
        },
      );
      expect(
        categoryRepository.findManyWithArchivedByUserId,
      ).not.toHaveBeenCalled();
    });

    it("calls categoryRepository when transactions are found", async () => {
      // Arrange
      // One transaction
      transactionRepository.findManyByUserId.mockResolvedValue([
        fakeExpense({
          amount: 100,
          date: toDateString("2000-04-01"),
        }),
      ]);
      // No categories
      categoryRepository.findManyWithArchivedByUserId.mockResolvedValue([]);

      // Act
      const result = await service.call({
        userId,
        periodUnit: "MONTH",
        lookback: 3,
        currency: "EUR",
        today: toDateString("2000-04-01"),
      });

      // Assert
      expect(result.success).toBe(true);

      expect(transactionRepository.findManyByUserId).toHaveBeenCalledWith(
        userId,
        {
          currencies: ["EUR"],
          dateAfter: "2000-01-01",
          dateBefore: "2000-04-01",
          types: [TransactionType.EXPENSE, TransactionType.REFUND],
        },
      );

      expect(
        categoryRepository.findManyWithArchivedByUserId,
      ).toHaveBeenCalledWith(userId);
    });

    it("forwards categoryIds and includeUncategorized to transactionRepository", async () => {
      // Arrange
      const categoryId = faker.string.uuid();
      // No transactions and no categories
      transactionRepository.findManyByUserId.mockResolvedValue([]);
      categoryRepository.findManyWithArchivedByUserId.mockResolvedValue([]);

      // Act
      await service.call({
        userId,
        periodUnit: "MONTH",
        lookback: 3,
        currency: "EUR",
        today: toDateString("2000-04-12"),
        categoryIds: [categoryId],
        includeUncategorized: true,
      });

      // Assert
      expect(transactionRepository.findManyByUserId).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          categoryIds: [categoryId],
          includeUncategorized: true,
        }),
      );
    });

    it("returns points for monthly periods", async () => {
      // Arrange
      // No transactions and no categories
      transactionRepository.findManyByUserId.mockResolvedValue([]);
      categoryRepository.findManyWithArchivedByUserId.mockResolvedValue([]);

      // Act
      const result = await service.call({
        userId,
        periodUnit: "MONTH",
        lookback: 3,
        currency: "EUR",
        today: toDateString("2000-04-12"),
      });

      // Assert
      expect(result).toMatchObject({
        data: {
          points: [
            { periodStart: "2000-01-01", amount: 0, isCurrent: false },
            { periodStart: "2000-02-01", amount: 0, isCurrent: false },
            { periodStart: "2000-03-01", amount: 0, isCurrent: false },
            { periodStart: "2000-04-01", amount: 0, isCurrent: true },
          ],
        },
      });
    });

    it("returns points for weekly periods", async () => {
      // Arrange
      // No transactions and no categories
      transactionRepository.findManyByUserId.mockResolvedValue([]);
      categoryRepository.findManyWithArchivedByUserId.mockResolvedValue([]);

      // Act
      const result = await service.call({
        userId,
        periodUnit: "WEEK",
        lookback: 3,
        currency: "EUR",
        today: toDateString("2000-01-25"), // Tuesday
      });

      // Assert
      expect(result).toMatchObject({
        data: {
          points: [
            { periodStart: "2000-01-03", amount: 0, isCurrent: false },
            { periodStart: "2000-01-10", amount: 0, isCurrent: false },
            { periodStart: "2000-01-17", amount: 0, isCurrent: false },
            { periodStart: "2000-01-24", amount: 0, isCurrent: true },
          ],
        },
      });
    });

    it("sums expenses into their own period", async () => {
      // Arrange
      // Transactions in four months, two per month
      transactionRepository.findManyByUserId.mockResolvedValue([
        fakeExpense({
          amount: 100,
          date: toDateString("2000-01-10"),
        }),
        fakeExpense({
          amount: 10,
          date: toDateString("2000-01-20"),
        }),
        fakeExpense({
          amount: 200,
          date: toDateString("2000-02-10"),
        }),
        fakeExpense({
          amount: 20,
          date: toDateString("2000-02-20"),
        }),
        fakeExpense({
          amount: 300,
          date: toDateString("2000-03-10"),
        }),
        fakeExpense({
          amount: 30,
          date: toDateString("2000-03-20"),
        }),
        fakeExpense({
          amount: 400,
          date: toDateString("2000-04-05"),
        }),
        fakeExpense({
          amount: 40,
          date: toDateString("2000-04-10"),
        }),
      ]);
      // No categories
      categoryRepository.findManyWithArchivedByUserId.mockResolvedValue([]);

      // Act
      const result = await service.call({
        userId,
        periodUnit: "MONTH",
        lookback: 3,
        currency: "EUR",
        today: toDateString("2000-04-12"),
      });

      // Assert
      expect(result).toMatchObject({
        data: {
          points: [
            { periodStart: "2000-01-01", amount: 110, isCurrent: false },
            { periodStart: "2000-02-01", amount: 220, isCurrent: false },
            { periodStart: "2000-03-01", amount: 330, isCurrent: false },
            { periodStart: "2000-04-01", amount: 440, isCurrent: true },
          ],
        },
      });
    });

    it("nets refunds against expenses", async () => {
      // Arrange
      // Refund reduces its own month's total
      transactionRepository.findManyByUserId.mockResolvedValue([
        fakeExpense({
          amount: 1000,
          date: toDateString("2000-03-10"),
        }),
        fakeRefund({
          amount: 200,
          date: toDateString("2000-03-20"),
        }),
      ]);
      // No categories
      categoryRepository.findManyWithArchivedByUserId.mockResolvedValue([]);

      // Act
      const result = await service.call({
        userId,
        periodUnit: "MONTH",
        lookback: 3,
        currency: "EUR",
        today: toDateString("2000-04-12"),
      });

      // Assert
      expect(result).toMatchObject({
        data: {
          points: expect.arrayContaining([
            { periodStart: "2000-03-01", amount: 800, isCurrent: false },
          ]),
        },
      });
    });

    it("returns median of completed period amounts", async () => {
      // Arrange
      transactionRepository.findManyByUserId.mockResolvedValue([
        fakeExpense({
          amount: 100,
          date: toDateString("2000-01-15"),
        }),
        fakeExpense({
          amount: 500,
          date: toDateString("2000-02-15"),
        }),
        fakeExpense({
          amount: 200,
          date: toDateString("2000-03-15"),
        }),
        fakeExpense({
          amount: 9999,
          date: toDateString("2000-04-05"),
        }),
      ]);
      // No categories
      categoryRepository.findManyWithArchivedByUserId.mockResolvedValue([]);
      const medianSpy = vi.spyOn(medianModule, "median");

      // Act
      const result = await service.call({
        userId,
        periodUnit: "MONTH",
        lookback: 3,
        currency: "EUR",
        today: toDateString("2000-04-12"),
      });

      // Assert
      expect(result).toMatchObject({
        data: {
          pastMedian: 200,
        },
      });

      expect(medianSpy).toHaveBeenCalledWith([100, 500, 200]);
    });

    it("returns median of completed period amounts truncated to elapsed days", async () => {
      // Arrange
      // Only transactions dated on or before day 12 of each month count
      transactionRepository.findManyByUserId.mockResolvedValue([
        // Before Jan 12
        fakeExpense({
          amount: 100,
          date: toDateString("2000-01-05"),
        }),
        fakeExpense({
          amount: 110,
          date: toDateString("2000-01-10"),
        }),
        // On Jan 12
        fakeExpense({
          amount: 10,
          date: toDateString("2000-01-12"),
        }),
        // After Jan 12
        fakeExpense({
          amount: 999,
          date: toDateString("2000-01-20"),
        }),
        // Before Feb 12
        fakeExpense({
          amount: 200,
          date: toDateString("2000-02-05"),
        }),
        // After Feb 12
        fakeExpense({
          amount: 999,
          date: toDateString("2000-02-20"),
        }),
        // Before Mar 12
        fakeExpense({
          amount: 300,
          date: toDateString("2000-03-05"),
        }),
        // After Mar 12
        fakeExpense({
          amount: 999,
          date: toDateString("2000-03-20"),
        }),
      ]);
      // No categories
      categoryRepository.findManyWithArchivedByUserId.mockResolvedValue([]);
      const medianSpy = vi.spyOn(medianModule, "median");

      // Act
      const result = await service.call({
        userId,
        periodUnit: "MONTH",
        lookback: 3,
        currency: "EUR",
        today: toDateString("2000-04-12"),
      });

      // Assert
      // Amounts are 220 (Jan), 200 (Feb), 300 (Mar)
      expect(result).toMatchObject({
        data: {
          pastMedianAtSamePoint: 220,
        },
      });

      expect(medianSpy).toHaveBeenCalledWith([220, 200, 300]);
    });

    it("returns median counting periods without transactions as zero", async () => {
      // Arrange
      // Three of six completed months hold nothing
      transactionRepository.findManyByUserId.mockResolvedValue([
        fakeExpense({
          amount: 100,
          date: toDateString("2000-01-05"),
        }),
        fakeExpense({
          amount: 200,
          date: toDateString("2000-02-05"),
        }),
        fakeExpense({
          amount: 300,
          date: toDateString("2000-03-05"),
        }),
      ]);
      // No categories
      categoryRepository.findManyWithArchivedByUserId.mockResolvedValue([]);
      const medianSpy = vi.spyOn(medianModule, "median");

      // Act
      const result = await service.call({
        userId,
        periodUnit: "MONTH",
        lookback: 6,
        currency: "EUR",
        today: toDateString("2000-07-20"),
      });

      // Assert
      // Completed period amounts are 100, 200, 300, 0, 0, 0
      expect(result).toMatchObject({
        data: {
          pastMedian: 50,
        },
      });
      expect(medianSpy).toHaveBeenCalledWith([100, 200, 300, 0, 0, 0]);
    });

    it("returns truncated median counting periods without transactions as zero", async () => {
      // Arrange
      // Three of six completed months hold nothing
      transactionRepository.findManyByUserId.mockResolvedValue([
        fakeExpense({
          amount: 100,
          date: toDateString("2000-01-05"),
        }),
        fakeExpense({
          amount: 200,
          date: toDateString("2000-02-05"),
        }),
        fakeExpense({
          amount: 300,
          date: toDateString("2000-03-05"),
        }),
      ]);
      // No categories
      categoryRepository.findManyWithArchivedByUserId.mockResolvedValue([]);
      const medianSpy = vi.spyOn(medianModule, "median");

      // Act
      const result = await service.call({
        userId,
        periodUnit: "MONTH",
        lookback: 6,
        currency: "EUR",
        today: toDateString("2000-07-20"),
      });

      // Assert
      // Truncated completed period amounts are 100, 200, 300, 0, 0, 0
      expect(result).toMatchObject({
        data: {
          pastMedianAtSamePoint: 50,
        },
      });
      expect(medianSpy).toHaveBeenCalledWith([100, 200, 300, 0, 0, 0]);
    });

    it("excludes transactions in categories flagged excludeFromReports", async () => {
      // Arrange
      const excludedCategory = fakeCategory({ excludeFromReports: true });
      const includedCategory = fakeCategory();
      categoryRepository.findManyWithArchivedByUserId.mockResolvedValue([
        excludedCategory,
        includedCategory,
      ]);
      transactionRepository.findManyByUserId.mockResolvedValue([
        fakeExpense({
          amount: 100,
          date: toDateString("2000-01-10"),
          categoryId: includedCategory.id,
        }),
        fakeExpense({
          amount: 900,
          date: toDateString("2000-01-11"),
          categoryId: excludedCategory.id,
        }),
      ]);

      // Act
      const result = await service.call({
        userId,
        periodUnit: "MONTH",
        lookback: 3,
        currency: "EUR",
        today: toDateString("2000-04-12"),
      });

      // Assert
      expect(result).toMatchObject({
        data: {
          points: [
            { periodStart: "2000-01-01", amount: 100, isCurrent: false },
            { periodStart: "2000-02-01", amount: 0, isCurrent: false },
            { periodStart: "2000-03-01", amount: 0, isCurrent: false },
            { periodStart: "2000-04-01", amount: 0, isCurrent: true },
          ],
        },
      });
    });

    it("excludes transactions in archived categories flagged excludeFromReports", async () => {
      // Arrange
      const archivedExcludedCategory = fakeCategory({
        excludeFromReports: true,
        isArchived: true,
      });
      categoryRepository.findManyWithArchivedByUserId.mockResolvedValue([
        archivedExcludedCategory,
      ]);
      transactionRepository.findManyByUserId.mockResolvedValue([
        fakeExpense({
          amount: 100,
          date: toDateString("2000-01-10"),
        }),
        fakeExpense({
          amount: 900,
          date: toDateString("2000-01-11"),
          categoryId: archivedExcludedCategory.id,
        }),
      ]);

      // Act
      const result = await service.call({
        userId,
        periodUnit: "MONTH",
        lookback: 3,
        currency: "EUR",
        today: toDateString("2000-04-12"),
      });

      // Assert
      expect(result).toMatchObject({
        data: {
          points: [
            { periodStart: "2000-01-01", amount: 100, isCurrent: false },
            { periodStart: "2000-02-01", amount: 0, isCurrent: false },
            { periodStart: "2000-03-01", amount: 0, isCurrent: false },
            { periodStart: "2000-04-01", amount: 0, isCurrent: true },
          ],
        },
      });
    });

    it("ignores transactions dated after today in running period", async () => {
      // Arrange
      transactionRepository.findManyByUserId.mockResolvedValue([
        fakeExpense({
          amount: 100,
          date: toDateString("2000-04-05"), // Before today, should be counted
        }),
        fakeExpense({
          amount: 900,
          date: toDateString("2000-04-13"), // After today, should be ignored
        }),
      ]);
      // No categories
      categoryRepository.findManyWithArchivedByUserId.mockResolvedValue([]);

      // Act
      const result = await service.call({
        userId,
        periodUnit: "MONTH",
        lookback: 3,
        currency: "EUR",
        today: toDateString("2000-04-12"),
      });

      // Assert
      expect(result).toMatchObject({
        data: {
          points: [
            { periodStart: "2000-01-01", amount: 0, isCurrent: false },
            { periodStart: "2000-02-01", amount: 0, isCurrent: false },
            { periodStart: "2000-03-01", amount: 0, isCurrent: false },
            { periodStart: "2000-04-01", amount: 100, isCurrent: true },
          ],
        },
      });
    });

    // Validation failures

    it("returns failure when lookback is not 3, 6 or 12", async () => {
      // Act
      const result = await service.call({
        userId,
        periodUnit: "MONTH",
        lookback: 99,
        currency: "EUR",
        today: toDateString("2000-04-12"),
      });

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Lookback must be 3, 6 or 12",
      });
      expect(transactionRepository.findManyByUserId).not.toHaveBeenCalled();
    });

    it("returns failure when currency is empty", async () => {
      // Act
      const result = await service.call({
        userId,
        periodUnit: "MONTH",
        lookback: 3,
        currency: "",
        today: toDateString("2000-04-12"),
      });

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Currency must not be empty",
      });
      expect(transactionRepository.findManyByUserId).not.toHaveBeenCalled();
    });
  });
});
