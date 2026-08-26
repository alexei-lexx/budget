import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { TransactionType } from "../models/transaction";
import { CategoryRepository } from "../ports/category-repository";
import { TransactionRepository } from "../ports/transaction-repository";
import { toDateString } from "../types/date";
import { fakeCategory } from "../utils/test-utils/models/category-fakes";
import { fakeTransaction } from "../utils/test-utils/models/transaction-fakes";
import { createMockCategoryRepository } from "../utils/test-utils/repositories/category-repository-mocks";
import { createMockTransactionRepository } from "../utils/test-utils/repositories/transaction-repository-mocks";
import { ExpenseTrendService } from "./expense-trend-service";

describe("ExpenseTrendService", () => {
  let transactionRepository: Mocked<TransactionRepository>;
  let categoryRepository: Mocked<CategoryRepository>;
  let service: ExpenseTrendService;

  const userId = faker.string.uuid();

  const expense = (date: string, amount: number, categoryId?: string) =>
    fakeTransaction({
      userId,
      type: TransactionType.EXPENSE,
      amount,
      categoryId,
      date: toDateString(date),
    });

  const refund = (date: string, amount: number) =>
    fakeTransaction({
      userId,
      type: TransactionType.REFUND,
      amount,
      date: toDateString(date),
    });

  beforeEach(() => {
    transactionRepository = createMockTransactionRepository();
    categoryRepository = createMockCategoryRepository();
    service = new ExpenseTrendService(
      transactionRepository,
      categoryRepository,
    );

    // No transactions and no categories unless a test overrides them
    transactionRepository.findManyByUserId.mockResolvedValue([]);
    categoryRepository.findManyByUserId.mockResolvedValue([]);
  });

  describe("call", () => {
    // Happy path

    it("returns one point per calendar month, oldest first, with running month last", async () => {
      // Act
      const result = await service.call({
        userId,
        period: "MONTH",
        lookback: 3,
        currency: "EUR",
        today: "2026-04-10",
      });

      // Assert
      expect(result).toEqual({
        success: true,
        data: {
          points: [
            { periodStart: "2026-01-01", amount: 0, isCurrent: false },
            { periodStart: "2026-02-01", amount: 0, isCurrent: false },
            { periodStart: "2026-03-01", amount: 0, isCurrent: false },
            { periodStart: "2026-04-01", amount: 0, isCurrent: true },
          ],
          pastMedian: 0,
          pastMedianAtSamePoint: 0,
          elapsedDays: 10,
        },
      });
    });

    it("returns weekly points starting Monday", async () => {
      // Act
      const result = await service.call({
        userId,
        period: "WEEK",
        lookback: 3,
        currency: "EUR",
        // Wednesday
        today: "2026-04-08",
      });

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.points.map((point) => point.periodStart)).toEqual([
        "2026-03-16",
        "2026-03-23",
        "2026-03-30",
        "2026-04-06",
      ]);
      expect(result.data.elapsedDays).toBe(3);
    });

    it("counts elapsed days including running day", async () => {
      // Act
      const result = await service.call({
        userId,
        period: "MONTH",
        lookback: 3,
        currency: "EUR",
        today: "2026-04-01",
      });

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.elapsedDays).toBe(1);
    });

    it("sums expenses into their own period", async () => {
      // Arrange
      // One expense in each completed month and one in running month
      transactionRepository.findManyByUserId.mockResolvedValue([
        expense("2026-01-15", 100),
        expense("2026-02-15", 300),
        expense("2026-03-15", 200),
        expense("2026-04-05", 50),
      ]);

      // Act
      const result = await service.call({
        userId,
        period: "MONTH",
        lookback: 3,
        currency: "EUR",
        today: "2026-04-10",
      });

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.points.map((point) => point.amount)).toEqual([
        100, 300, 200, 50,
      ]);
    });

    it("nets refunds against expenses", async () => {
      // Arrange
      // Refund reduces its own month's total
      transactionRepository.findManyByUserId.mockResolvedValue([
        expense("2026-03-10", 1000),
        refund("2026-03-20", 200),
      ]);

      // Act
      const result = await service.call({
        userId,
        period: "MONTH",
        lookback: 3,
        currency: "EUR",
        today: "2026-04-10",
      });

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.points[2]).toEqual({
        periodStart: "2026-03-01",
        amount: 800,
        isCurrent: false,
      });
    });

    it("returns median of completed periods when count is odd", async () => {
      // Arrange
      transactionRepository.findManyByUserId.mockResolvedValue([
        expense("2026-01-15", 100),
        expense("2026-02-15", 300),
        expense("2026-03-15", 200),
        expense("2026-04-05", 9999),
      ]);

      // Act
      const result = await service.call({
        userId,
        period: "MONTH",
        lookback: 3,
        currency: "EUR",
        today: "2026-04-10",
      });

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.pastMedian).toBe(200);
    });

    it("returns mean of two middle values when completed period count is even", async () => {
      // Arrange
      // Six completed months, two of which stay empty
      transactionRepository.findManyByUserId.mockResolvedValue([
        expense("2025-11-15", 100),
        expense("2025-12-15", 200),
        expense("2026-01-15", 300),
        expense("2026-02-15", 500),
      ]);

      // Act
      const result = await service.call({
        userId,
        period: "MONTH",
        lookback: 6,
        currency: "EUR",
        today: "2026-04-10",
      });

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.points.map((point) => point.amount)).toEqual([
        0, 100, 200, 300, 500, 0, 0,
      ]);
      // Sorted completed values are 0, 0, 100, 200, 300, 500
      expect(result.data.pastMedian).toBe(150);
    });

    it("truncates completed periods to their first elapsed days for same-point median", async () => {
      // Arrange
      // Only transactions dated on or before day 12 of each month count
      transactionRepository.findManyByUserId.mockResolvedValue([
        expense("2026-01-05", 100),
        expense("2026-01-20", 900),
        expense("2026-02-12", 300),
        expense("2026-02-25", 900),
        expense("2026-03-13", 900),
      ]);

      // Act
      const result = await service.call({
        userId,
        period: "MONTH",
        lookback: 3,
        currency: "EUR",
        today: "2026-04-12",
      });

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.elapsedDays).toBe(12);
      // Truncated completed values are 100, 300, 0
      expect(result.data.pastMedianAtSamePoint).toBe(100);
      expect(result.data.pastMedian).toBe(1000);
    });

    it("counts periods without transactions as zero in both medians", async () => {
      // Arrange
      // Three of six completed months hold nothing
      transactionRepository.findManyByUserId.mockResolvedValue([
        expense("2026-01-05", 100),
        expense("2026-02-05", 200),
        expense("2026-03-05", 300),
      ]);

      // Act
      const result = await service.call({
        userId,
        period: "MONTH",
        lookback: 6,
        currency: "EUR",
        today: "2026-04-10",
      });

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.points.map((point) => point.amount)).toEqual([
        0, 0, 0, 100, 200, 300, 0,
      ]);
      // Sorted completed values are 0, 0, 0, 100, 200, 300
      expect(result.data.pastMedian).toBe(50);
      expect(result.data.pastMedianAtSamePoint).toBe(50);
    });

    it("excludes transactions in categories flagged excludeFromReports", async () => {
      // Arrange
      const excludedCategory = fakeCategory({
        userId,
        excludeFromReports: true,
      });
      const includedCategory = fakeCategory({ userId });
      categoryRepository.findManyByUserId.mockResolvedValue([
        excludedCategory,
        includedCategory,
      ]);
      transactionRepository.findManyByUserId.mockResolvedValue([
        expense("2026-03-10", 100, includedCategory.id),
        expense("2026-03-11", 900, excludedCategory.id),
      ]);

      // Act
      const result = await service.call({
        userId,
        period: "MONTH",
        lookback: 3,
        currency: "EUR",
        today: "2026-04-10",
      });

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.points[2].amount).toBe(100);
    });

    it("ignores transactions dated after today in running period", async () => {
      // Arrange
      // Second transaction falls three days ahead of today
      transactionRepository.findManyByUserId.mockResolvedValue([
        expense("2026-04-05", 100),
        expense("2026-04-13", 900),
      ]);

      // Act
      const result = await service.call({
        userId,
        period: "MONTH",
        lookback: 3,
        currency: "EUR",
        today: "2026-04-10",
      });

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.points[3]).toEqual({
        periodStart: "2026-04-01",
        amount: 100,
        isCurrent: true,
      });
    });

    it("reads transactions filtered by currency, date range, types and categories", async () => {
      // Arrange
      const categoryId = faker.string.uuid();

      // Act
      await service.call({
        userId,
        period: "MONTH",
        lookback: 3,
        currency: "EUR",
        today: "2026-04-10",
        categoryIds: [categoryId],
        includeUncategorized: true,
      });

      // Assert
      expect(transactionRepository.findManyByUserId).toHaveBeenCalledWith(
        userId,
        {
          categoryIds: [categoryId],
          currencies: ["EUR"],
          dateAfter: "2026-01-01",
          dateBefore: "2026-04-10",
          includeUncategorized: true,
          types: [TransactionType.EXPENSE, TransactionType.REFUND],
        },
      );
    });

    // Validation failures

    it("returns failure when lookback is not 3, 6 or 12", async () => {
      // Act
      const result = await service.call({
        userId,
        period: "MONTH",
        lookback: 99,
        currency: "EUR",
        today: "2026-04-10",
      });

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Lookback must be 3, 6 or 12",
      });
      expect(transactionRepository.findManyByUserId).not.toHaveBeenCalled();
    });

    it("returns failure when today is not valid date", async () => {
      // Act
      const result = await service.call({
        userId,
        period: "MONTH",
        lookback: 3,
        currency: "EUR",
        today: "2026-02-30",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(transactionRepository.findManyByUserId).not.toHaveBeenCalled();
    });

    it("returns failure when currency is empty", async () => {
      // Act
      const result = await service.call({
        userId,
        period: "MONTH",
        lookback: 3,
        currency: "",
        today: "2026-04-10",
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
