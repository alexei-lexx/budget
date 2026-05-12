import { faker } from "@faker-js/faker";
import { v4 as uuidv4 } from "uuid";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { ReportType } from "../models/report";
import { TransactionType } from "../models/transaction";
import { CategoryRepository } from "../ports/category-repository";
import { TransactionRepository } from "../ports/transaction-repository";
import { toDateString } from "../types/date";
import { fakeCategory } from "../utils/test-utils/models/category-fakes";
import { fakeTransaction } from "../utils/test-utils/models/transaction-fakes";
import { createMockCategoryRepository } from "../utils/test-utils/repositories/category-repository-mocks";
import { createMockTransactionRepository } from "../utils/test-utils/repositories/transaction-repository-mocks";
import { ByCategoryReportService } from "./by-category-report-service";

describe("ByCategoryReportService", () => {
  let reportService: ByCategoryReportService;
  let mockTransactionRepository: Mocked<TransactionRepository>;
  let mockCategoryRepository: Mocked<CategoryRepository>;

  const userId = uuidv4();

  beforeEach(() => {
    mockTransactionRepository = createMockTransactionRepository();
    mockCategoryRepository = createMockCategoryRepository();

    // Default: no categories so nothing is excluded from reports
    mockCategoryRepository.findManyByUserId.mockResolvedValue([]);

    reportService = new ByCategoryReportService(
      mockTransactionRepository,
      mockCategoryRepository,
    );
  });

  describe("call", () => {
    // Happy path

    it("returns empty report when no transactions exist", async () => {
      // Arrange
      // No transactions in given month
      mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

      // Act
      const result = await reportService.call(
        userId,
        2000,
        1,
        ReportType.EXPENSE,
      );

      // Assert
      expect(result).toEqual({
        year: 2000,
        month: 1,
        type: TransactionType.EXPENSE,
        categories: [],
        currencyTotals: [],
      });
    });

    it("groups transactions by category and currency", async () => {
      // Arrange
      const categoryId1 = faker.string.uuid();
      const categoryId2 = faker.string.uuid();

      // Transactions across two categories, two currencies, plus uncategorized
      const transactions = [
        fakeTransaction({
          categoryId: categoryId1,
          currency: "USD",
          amount: 100,
        }),
        fakeTransaction({
          categoryId: categoryId1,
          currency: "EUR",
          amount: 50,
        }),
        fakeTransaction({
          categoryId: categoryId2,
          currency: "USD",
          amount: 200,
        }),
        fakeTransaction({ categoryId: undefined, currency: "USD", amount: 75 }),
      ];
      mockTransactionRepository.findManyByUserId.mockResolvedValue(
        transactions,
      );

      // Resolve each categoryId in order to its named category
      mockCategoryRepository.findOneById
        .mockResolvedValueOnce(fakeCategory({ id: categoryId1, name: "Food" }))
        .mockResolvedValueOnce(
          fakeCategory({ id: categoryId2, name: "Transport" }),
        );

      // Act
      const result = await reportService.call(
        userId,
        2000,
        1,
        ReportType.EXPENSE,
      );

      // Assert
      expect(result.categories).toHaveLength(3);
      expect(result.categories.map((c) => c.categoryName).sort()).toEqual([
        "Food",
        "Transport",
        "Uncategorized",
      ]);

      // topTransactions and totalTransactionCount populated per category
      result.categories.forEach((category) => {
        expect(category.topTransactions).toBeDefined();
        expect(category.totalTransactionCount).toBeDefined();
      });
    });

    it("includes top 5 transactions sorted by amount", async () => {
      // Arrange
      const categoryId = faker.string.uuid();

      // 7 transactions with different amounts under one category
      const transactions = [
        fakeTransaction({ categoryId, amount: 100 }),
        fakeTransaction({ categoryId, amount: 500 }),
        fakeTransaction({ categoryId, amount: 200 }),
        fakeTransaction({ categoryId, amount: 50 }),
        fakeTransaction({ categoryId, amount: 300 }),
        fakeTransaction({ categoryId, amount: 150 }),
        fakeTransaction({ categoryId, amount: 400 }),
      ];
      mockTransactionRepository.findManyByUserId.mockResolvedValue(
        transactions,
      );

      // Resolve categoryId to named category
      mockCategoryRepository.findOneById.mockResolvedValue(
        fakeCategory({ id: categoryId, name: "Shopping" }),
      );

      // Act
      const result = await reportService.call(
        userId,
        2000,
        1,
        ReportType.EXPENSE,
      );

      // Assert
      expect(result.categories).toHaveLength(1);
      const category = result.categories[0];

      // Top 5 transactions only
      expect(category.topTransactions).toHaveLength(5);
      expect(category.totalTransactionCount).toBe(7);

      // Sorted by amount descending
      const amounts = category.topTransactions.map((t) => t.amount);
      expect(amounts).toEqual([500, 400, 300, 200, 150]);
    });

    it("calculates currency totals", async () => {
      // Arrange
      // Two currencies across three transactions
      const transactions = [
        fakeTransaction({ currency: "USD", amount: 100 }),
        fakeTransaction({ currency: "USD", amount: 200 }),
        fakeTransaction({ currency: "EUR", amount: 150 }),
      ];
      mockTransactionRepository.findManyByUserId.mockResolvedValue(
        transactions,
      );

      // Act
      const result = await reportService.call(
        userId,
        2000,
        1,
        ReportType.EXPENSE,
      );

      // Assert
      expect(result.currencyTotals).toEqual([
        { currency: "EUR", totalAmount: 150 },
        { currency: "USD", totalAmount: 300 },
      ]);
    });

    it("calculates percentages within each currency", async () => {
      // Arrange
      const categoryId = uuidv4();

      // One categorized and one uncategorized transaction in same currency
      const transactions = [
        fakeTransaction({ categoryId, currency: "USD", amount: 100 }),
        fakeTransaction({
          categoryId: undefined,
          currency: "USD",
          amount: 300,
        }),
      ];
      mockTransactionRepository.findManyByUserId.mockResolvedValue(
        transactions,
      );

      // Resolve categoryId to named category
      mockCategoryRepository.findOneById.mockResolvedValue(
        fakeCategory({ id: categoryId, name: "Food" }),
      );

      // Act
      const result = await reportService.call(
        userId,
        2000,
        1,
        ReportType.EXPENSE,
      );

      // Assert
      const foodCategory = result.categories.find(
        (c) => c.categoryName === "Food",
      );
      const uncategorizedCategory = result.categories.find(
        (c) => c.categoryName === "Uncategorized",
      );

      expect(foodCategory?.currencyBreakdowns[0].percentage).toBe(25); // 100/400 = 25%
      expect(uncategorizedCategory?.currencyBreakdowns[0].percentage).toBe(75); // 300/400 = 75%
    });

    it("treats transactions without categories as Uncategorized", async () => {
      // Arrange
      // Two uncategorized transactions in different currencies
      const transactions = [
        fakeTransaction({
          categoryId: undefined,
          currency: "USD",
          amount: 100,
        }),
        fakeTransaction({ categoryId: undefined, currency: "EUR", amount: 50 }),
      ];
      mockTransactionRepository.findManyByUserId.mockResolvedValue(
        transactions,
      );

      // Act
      const result = await reportService.call(
        userId,
        2000,
        1,
        ReportType.EXPENSE,
      );

      // Assert
      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].categoryName).toBe("Uncategorized");
      expect(result.categories[0].categoryId).toBeUndefined();
      expect(result.categories[0].currencyBreakdowns).toHaveLength(2);
    });

    it("treats deleted categories as Uncategorized", async () => {
      // Arrange
      const deletedCategoryId = uuidv4();

      // Transaction references deleted category
      const transactions = [
        fakeTransaction({
          categoryId: deletedCategoryId,
          currency: "USD",
          amount: 100,
        }),
      ];
      mockTransactionRepository.findManyByUserId.mockResolvedValue(
        transactions,
      );

      // Category lookup returns null for deleted category
      mockCategoryRepository.findOneById.mockResolvedValue(null);

      // Act
      const result = await reportService.call(
        userId,
        2000,
        1,
        ReportType.EXPENSE,
      );

      // Assert
      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].categoryName).toBe("Uncategorized");
    });

    it("sorts categories alphabetically by name", async () => {
      // Arrange
      const categoryId1 = uuidv4();
      const categoryId2 = uuidv4();

      // Transactions across two categories plus uncategorized
      const transactions = [
        fakeTransaction({
          categoryId: categoryId1,
          currency: "USD",
          amount: 100,
        }),
        fakeTransaction({
          categoryId: categoryId2,
          currency: "USD",
          amount: 200,
        }),
        fakeTransaction({ categoryId: undefined, currency: "USD", amount: 50 }),
      ];
      mockTransactionRepository.findManyByUserId.mockResolvedValue(
        transactions,
      );

      // Resolve categories with names that need alphabetical sorting
      mockCategoryRepository.findOneById
        .mockResolvedValueOnce(fakeCategory({ id: categoryId1, name: "Zebra" }))
        .mockResolvedValueOnce(
          fakeCategory({ id: categoryId2, name: "Apple" }),
        );

      // Act
      const result = await reportService.call(
        userId,
        2000,
        1,
        ReportType.EXPENSE,
      );

      // Assert
      expect(result.categories.map((c) => c.categoryName)).toEqual([
        "Apple",
        "Uncategorized",
        "Zebra",
      ]);
    });

    it("sorts currencies alphabetically within breakdowns and totals", async () => {
      // Arrange
      // Three currencies on uncategorized transactions
      const transactions = [
        fakeTransaction({
          categoryId: undefined,
          currency: "USD",
          amount: 100,
        }),
        fakeTransaction({ categoryId: undefined, currency: "EUR", amount: 50 }),
        fakeTransaction({ categoryId: undefined, currency: "GBP", amount: 75 }),
      ];
      mockTransactionRepository.findManyByUserId.mockResolvedValue(
        transactions,
      );

      // Act
      const result = await reportService.call(
        userId,
        2000,
        1,
        ReportType.EXPENSE,
      );

      // Assert
      expect(result.currencyTotals.map((ct) => ct.currency)).toEqual([
        "EUR",
        "GBP",
        "USD",
      ]);
      expect(
        result.categories[0].currencyBreakdowns.map((cb) => cb.currency),
      ).toEqual(["EUR", "GBP", "USD"]);
    });

    it("rounds percentages to whole numbers", async () => {
      // Arrange
      // Two transactions whose ratio is not a whole percentage
      const transactions = [
        fakeTransaction({
          categoryId: undefined,
          currency: "USD",
          amount: 100,
        }),
        fakeTransaction({
          categoryId: undefined,
          currency: "USD",
          amount: 233,
        }),
      ];
      mockTransactionRepository.findManyByUserId.mockResolvedValue(
        transactions,
      );

      // Act
      const result = await reportService.call(
        userId,
        2000,
        1,
        ReportType.EXPENSE,
      );

      // Assert
      const percentages = result.categories[0].currencyBreakdowns[0].percentage;
      expect(Number.isInteger(percentages)).toBe(true);
      expect(percentages).toBe(100); // Rounds to 100% for single category
    });

    it("calculates net amount as expenses minus refunds", async () => {
      // Arrange
      const categoryId = uuidv4();
      const expenseTransaction = fakeTransaction({
        categoryId,
        type: TransactionType.EXPENSE,
        amount: 1000,
        currency: "EUR",
      });
      const refundTransaction = fakeTransaction({
        categoryId,
        type: TransactionType.REFUND,
        amount: 200,
        currency: "EUR",
      });

      // Repository returns expense and refund for same category
      mockTransactionRepository.findManyByUserId.mockResolvedValue([
        expenseTransaction,
        refundTransaction,
      ]);

      // Resolve categoryId to named category
      mockCategoryRepository.findOneById.mockResolvedValue(
        fakeCategory({ id: categoryId }),
      );

      // Act
      const result = await reportService.call(
        userId,
        2025,
        11,
        ReportType.EXPENSE,
      );

      // Assert
      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].currencyBreakdowns[0].totalAmount).toBe(800); // 1000 - 200
      expect(result.currencyTotals[0].totalAmount).toBe(800);
    });

    it("returns negative net amount when refunds exceed expenses", async () => {
      // Arrange
      const categoryId = uuidv4();
      const refundTransaction = fakeTransaction({
        categoryId,
        type: TransactionType.REFUND,
        amount: 300,
        currency: "EUR",
      });

      // Repository returns only a refund (no offsetting expense)
      mockTransactionRepository.findManyByUserId.mockResolvedValue([
        refundTransaction,
      ]);

      // Resolve categoryId to named category
      mockCategoryRepository.findOneById.mockResolvedValue(
        fakeCategory({ id: categoryId }),
      );

      // Act
      const result = await reportService.call(
        userId,
        2025,
        11,
        ReportType.EXPENSE,
      );

      // Assert
      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].currencyBreakdowns[0].totalAmount).toBe(-300);
      expect(result.currencyTotals[0].totalAmount).toBe(-300);
    });

    it("does not factor refunds for INCOME reports", async () => {
      // Arrange
      const categoryId = uuidv4();
      const incomeTransaction = fakeTransaction({
        categoryId,
        type: TransactionType.INCOME,
        amount: 500,
        currency: "EUR",
      });

      // Repository returns single income transaction
      mockTransactionRepository.findManyByUserId.mockResolvedValue([
        incomeTransaction,
      ]);

      // Resolve categoryId to named category
      mockCategoryRepository.findOneById.mockResolvedValue(
        fakeCategory({ id: categoryId }),
      );

      // Act
      const result = await reportService.call(
        userId,
        2025,
        11,
        ReportType.INCOME,
      );

      // Assert
      expect(result.categories[0].currencyBreakdowns[0].totalAmount).toBe(500);
      expect(mockTransactionRepository.findManyByUserId).toHaveBeenCalledWith(
        userId,
        {
          dateAfter: toDateString("2025-11-01"),
          dateBefore: toDateString("2025-11-30"),
          types: [TransactionType.INCOME], // Only INCOME, no REFUND
        },
      );
    });

    it("handles multiple currencies with refunds", async () => {
      // Arrange
      const categoryId = uuidv4();

      // Expense and refund pairs in two currencies
      const transactions = [
        fakeTransaction({
          categoryId,
          type: TransactionType.EXPENSE,
          amount: 1000,
          currency: "EUR",
        }),
        fakeTransaction({
          categoryId,
          type: TransactionType.REFUND,
          amount: 200,
          currency: "EUR",
        }),
        fakeTransaction({
          categoryId,
          type: TransactionType.EXPENSE,
          amount: 500,
          currency: "USD",
        }),
        fakeTransaction({
          categoryId,
          type: TransactionType.REFUND,
          amount: 100,
          currency: "USD",
        }),
      ];
      mockTransactionRepository.findManyByUserId.mockResolvedValue(
        transactions,
      );

      // Resolve categoryId to named category
      mockCategoryRepository.findOneById.mockResolvedValue(
        fakeCategory({ id: categoryId }),
      );

      // Act
      const result = await reportService.call(
        userId,
        2025,
        11,
        ReportType.EXPENSE,
      );

      // Assert
      expect(result.categories).toHaveLength(1);
      const eurBreakdown = result.categories[0].currencyBreakdowns.find(
        (cb) => cb.currency === "EUR",
      );
      const usdBreakdown = result.categories[0].currencyBreakdowns.find(
        (cb) => cb.currency === "USD",
      );

      expect(eurBreakdown?.totalAmount).toBe(800); // 1000 - 200
      expect(usdBreakdown?.totalAmount).toBe(400); // 500 - 100
    });

    it("handles uncategorized transactions with refunds", async () => {
      // Arrange
      // Uncategorized expense and refund in same currency
      const transactions = [
        fakeTransaction({
          categoryId: undefined,
          type: TransactionType.EXPENSE,
          amount: 600,
          currency: "EUR",
        }),
        fakeTransaction({
          categoryId: undefined,
          type: TransactionType.REFUND,
          amount: 100,
          currency: "EUR",
        }),
      ];
      mockTransactionRepository.findManyByUserId.mockResolvedValue(
        transactions,
      );

      // Act
      const result = await reportService.call(
        userId,
        2025,
        11,
        ReportType.EXPENSE,
      );

      // Assert
      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].categoryName).toBe("Uncategorized");
      expect(result.categories[0].currencyBreakdowns[0].totalAmount).toBe(500); // 600 - 100
    });

    it("excludes transactions in excluded categories from report", async () => {
      // Arrange
      const includedCategory = fakeCategory({
        userId,
        name: "Groceries",
        excludeFromReports: false,
      });
      const excludedCategory = fakeCategory({
        userId,
        excludeFromReports: true,
      });

      // Three transactions: uncategorized, in included category, in excluded category
      const transactions = [
        fakeTransaction({
          categoryId: undefined,
          currency: "USD",
          amount: 100,
          type: TransactionType.EXPENSE,
        }),
        fakeTransaction({
          categoryId: includedCategory.id,
          currency: "USD",
          amount: 200,
          type: TransactionType.EXPENSE,
        }),
        fakeTransaction({
          categoryId: excludedCategory.id,
          currency: "USD",
          amount: 500,
          type: TransactionType.EXPENSE,
        }),
      ];
      mockTransactionRepository.findManyByUserId.mockResolvedValue(
        transactions,
      );

      // User has one included and one excluded category
      mockCategoryRepository.findManyByUserId.mockResolvedValue([
        includedCategory,
        excludedCategory,
      ]);

      // Resolve only included category by id
      mockCategoryRepository.findOneById.mockResolvedValueOnce(
        includedCategory,
      );

      // Act
      const result = await reportService.call(
        userId,
        2000,
        1,
        ReportType.EXPENSE,
      );

      // Assert
      expect(result.currencyTotals).toHaveLength(1);
      expect(result.currencyTotals[0].totalAmount).toBe(300); // 100 + 200, excluding 500
      expect(
        result.categories.map((category) => category.categoryName).sort(),
      ).toEqual(["Groceries", "Uncategorized"]);
    });

    it("succeeds for months 1 through 12", async () => {
      // Arrange
      const currentYear = new Date().getFullYear();

      // No transactions in any month
      mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

      // Act & Assert
      for (let month = 1; month <= 12; month++) {
        await expect(
          reportService.call(userId, currentYear, month, ReportType.EXPENSE),
        ).resolves.toBeDefined();
      }
    });

    // Validation failures

    it("throws when year is not integer", async () => {
      // Act & Assert
      await expect(
        reportService.call(userId, 2000.5, 1, ReportType.EXPENSE),
      ).rejects.toMatchObject({
        message: "Year must be a valid integer",
      });
    });

    it("throws when month is out of range or fractional", async () => {
      // Arrange
      const currentYear = new Date().getFullYear();
      const invalidMonths = [0, 13, 5.5];

      // Act & Assert
      for (const invalidMonth of invalidMonths) {
        await expect(
          reportService.call(
            userId,
            currentYear,
            invalidMonth,
            ReportType.EXPENSE,
          ),
        ).rejects.toMatchObject({
          message: "Month must be a valid integer between 1 and 12",
        });
      }
    });

    describe("when month is undefined", () => {
      // Happy path

      it("uses full-year date range", async () => {
        // Arrange
        // No transactions in full-year range
        mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

        // Act
        await reportService.call(userId, 2000, undefined, ReportType.EXPENSE);

        // Assert
        expect(mockTransactionRepository.findManyByUserId).toHaveBeenCalledWith(
          userId,
          {
            dateAfter: toDateString("2000-01-01"),
            dateBefore: toDateString("2000-12-31"),
            types: [TransactionType.EXPENSE, TransactionType.REFUND],
          },
        );
      });

      it("returns month as undefined in result", async () => {
        // Arrange
        // No transactions in full-year range
        mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

        // Act
        const result = await reportService.call(
          userId,
          2000,
          undefined,
          ReportType.EXPENSE,
        );

        // Assert
        expect(result.month).toBeUndefined();
        expect(result.year).toBe(2000);
      });

      it("calculates currency totals across full year", async () => {
        // Arrange
        // Two expense transactions in same currency
        const transactions = [
          fakeTransaction({
            type: TransactionType.EXPENSE,
            amount: 100,
            currency: "EUR",
          }),
          fakeTransaction({
            type: TransactionType.EXPENSE,
            amount: 200,
            currency: "EUR",
          }),
        ];
        mockTransactionRepository.findManyByUserId.mockResolvedValue(
          transactions,
        );

        // Resolve any categoryId to a placeholder category
        mockCategoryRepository.findOneById.mockResolvedValue(fakeCategory());

        // Act
        const result = await reportService.call(
          userId,
          2000,
          undefined,
          ReportType.EXPENSE,
        );

        // Assert
        expect(result.currencyTotals).toEqual([
          { currency: "EUR", totalAmount: 300 },
        ]);
      });
    });
  });
});
