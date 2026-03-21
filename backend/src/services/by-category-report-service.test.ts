import { faker } from "@faker-js/faker";
import { v4 as uuidv4 } from "uuid";
import { ReportType } from "../models/report";
import { TransactionType } from "../models/transaction";
import { fakeCategory, fakeTransaction } from "../utils/test-utils/factories";
import {
  createMockCategoryRepository,
  createMockTransactionRepository,
} from "../utils/test-utils/mock-repositories";
import { ByCategoryReportService } from "./by-category-report-service";
import { CategoryRepository } from "./ports/category-repository";
import { TransactionRepository } from "./ports/transaction-repository";

describe("ByCategoryReportService", () => {
  let reportService: ByCategoryReportService;
  let mockTransactionRepository: jest.Mocked<TransactionRepository>;
  let mockCategoryRepository: jest.Mocked<CategoryRepository>;

  const userId = uuidv4();

  beforeEach(() => {
    mockTransactionRepository = createMockTransactionRepository();
    mockCategoryRepository = createMockCategoryRepository();

    // Default mock: return empty array for findActiveByUserId (all categories included by default)
    mockCategoryRepository.findActiveByUserId.mockResolvedValue([]);

    reportService = new ByCategoryReportService(
      mockTransactionRepository,
      mockCategoryRepository,
    );
  });

  describe("call", () => {
    it("should return empty report when no transactions exist", async () => {
      mockTransactionRepository.findActiveByUserId.mockResolvedValue([]);

      const result = await reportService.call(
        userId,
        2000,
        1,
        ReportType.EXPENSE,
      );

      expect(result).toEqual({
        year: 2000,
        month: 1,
        type: TransactionType.EXPENSE,
        categories: [],
        currencyTotals: [],
      });
    });

    it("should group transactions by category and currency", async () => {
      const categoryId1 = faker.string.uuid();
      const categoryId2 = faker.string.uuid();

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

      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        transactions,
      );
      mockCategoryRepository.findActiveById
        .mockResolvedValueOnce(fakeCategory({ id: categoryId1, name: "Food" }))
        .mockResolvedValueOnce(
          fakeCategory({ id: categoryId2, name: "Transport" }),
        );

      const result = await reportService.call(
        userId,
        2000,
        1,
        ReportType.EXPENSE,
      );

      expect(result.categories).toHaveLength(3);
      expect(result.categories.map((c) => c.categoryName).sort()).toEqual([
        "Food",
        "Transport",
        "Uncategorized",
      ]);

      // Verify topTransactions are included
      result.categories.forEach((category) => {
        expect(category.topTransactions).toBeDefined();
        expect(category.totalTransactionCount).toBeDefined();
      });
    });

    it("should include top 5 transactions sorted by amount", async () => {
      const categoryId = faker.string.uuid();

      // Create 7 transactions with different amounts
      const transactions = [
        fakeTransaction({ categoryId, amount: 100 }),
        fakeTransaction({ categoryId, amount: 500 }),
        fakeTransaction({ categoryId, amount: 200 }),
        fakeTransaction({ categoryId, amount: 50 }),
        fakeTransaction({ categoryId, amount: 300 }),
        fakeTransaction({ categoryId, amount: 150 }),
        fakeTransaction({ categoryId, amount: 400 }),
      ];

      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        transactions,
      );
      mockCategoryRepository.findActiveById.mockResolvedValue(
        fakeCategory({ id: categoryId, name: "Shopping" }),
      );

      const result = await reportService.call(
        userId,
        2000,
        1,
        ReportType.EXPENSE,
      );

      expect(result.categories).toHaveLength(1);
      const category = result.categories[0];

      // Should have top 5 transactions
      expect(category.topTransactions).toHaveLength(5);
      expect(category.totalTransactionCount).toBe(7);

      // Should be sorted by amount descending
      const amounts = category.topTransactions.map((t) => t.amount);
      expect(amounts).toEqual([500, 400, 300, 200, 150]);
    });

    it("should calculate currency totals correctly", async () => {
      const transactions = [
        fakeTransaction({ currency: "USD", amount: 100 }),
        fakeTransaction({ currency: "USD", amount: 200 }),
        fakeTransaction({ currency: "EUR", amount: 150 }),
      ];

      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        transactions,
      );

      const result = await reportService.call(
        userId,
        2000,
        1,
        ReportType.EXPENSE,
      );

      expect(result.currencyTotals).toEqual([
        { currency: "EUR", totalAmount: 150 },
        { currency: "USD", totalAmount: 300 },
      ]);
    });

    it("should calculate percentages within each currency", async () => {
      const categoryId = uuidv4();
      const transactions = [
        fakeTransaction({ categoryId, currency: "USD", amount: 100 }),
        fakeTransaction({
          categoryId: undefined,
          currency: "USD",
          amount: 300,
        }),
      ];

      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        transactions,
      );
      mockCategoryRepository.findActiveById.mockResolvedValue(
        fakeCategory({ id: categoryId, name: "Food" }),
      );

      const result = await reportService.call(
        userId,
        2000,
        1,
        ReportType.EXPENSE,
      );

      const foodCategory = result.categories.find(
        (c) => c.categoryName === "Food",
      );
      const uncategorizedCategory = result.categories.find(
        (c) => c.categoryName === "Uncategorized",
      );

      expect(foodCategory?.currencyBreakdowns[0].percentage).toBe(25); // 100/400 = 25%
      expect(uncategorizedCategory?.currencyBreakdowns[0].percentage).toBe(75); // 300/400 = 75%
    });

    it("should handle transactions without categories as Uncategorized", async () => {
      const transactions = [
        fakeTransaction({
          categoryId: undefined,
          currency: "USD",
          amount: 100,
        }),
        fakeTransaction({ categoryId: undefined, currency: "EUR", amount: 50 }),
      ];

      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        transactions,
      );

      const result = await reportService.call(
        userId,
        2000,
        1,
        ReportType.EXPENSE,
      );

      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].categoryName).toBe("Uncategorized");
      expect(result.categories[0].categoryId).toBeUndefined();
      expect(result.categories[0].currencyBreakdowns).toHaveLength(2);
    });

    it("should handle deleted categories as Uncategorized", async () => {
      const deletedCategoryId = uuidv4();
      const transactions = [
        fakeTransaction({
          categoryId: deletedCategoryId,
          currency: "USD",
          amount: 100,
        }),
      ];

      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        transactions,
      );
      mockCategoryRepository.findActiveById.mockResolvedValue(null);

      const result = await reportService.call(
        userId,
        2000,
        1,
        ReportType.EXPENSE,
      );

      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].categoryName).toBe("Uncategorized");
    });

    it("should sort categories alphabetically by name", async () => {
      const categoryId1 = uuidv4();
      const categoryId2 = uuidv4();

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

      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        transactions,
      );
      mockCategoryRepository.findActiveById
        .mockResolvedValueOnce(fakeCategory({ id: categoryId1, name: "Zebra" }))
        .mockResolvedValueOnce(
          fakeCategory({ id: categoryId2, name: "Apple" }),
        );

      const result = await reportService.call(
        userId,
        2000,
        1,
        ReportType.EXPENSE,
      );

      expect(result.categories.map((c) => c.categoryName)).toEqual([
        "Apple",
        "Uncategorized",
        "Zebra",
      ]);
    });

    it("should sort currencies alphabetically within breakdowns and totals", async () => {
      const transactions = [
        fakeTransaction({
          categoryId: undefined,
          currency: "USD",
          amount: 100,
        }),
        fakeTransaction({ categoryId: undefined, currency: "EUR", amount: 50 }),
        fakeTransaction({ categoryId: undefined, currency: "GBP", amount: 75 }),
      ];

      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        transactions,
      );

      const result = await reportService.call(
        userId,
        2000,
        1,
        ReportType.EXPENSE,
      );

      expect(result.currencyTotals.map((ct) => ct.currency)).toEqual([
        "EUR",
        "GBP",
        "USD",
      ]);
      expect(
        result.categories[0].currencyBreakdowns.map((cb) => cb.currency),
      ).toEqual(["EUR", "GBP", "USD"]);
    });

    it("should round percentages to whole numbers", async () => {
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

      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        transactions,
      );

      const result = await reportService.call(
        userId,
        2000,
        1,
        ReportType.EXPENSE,
      );

      const percentages = result.categories[0].currencyBreakdowns[0].percentage;
      expect(Number.isInteger(percentages)).toBe(true);
      expect(percentages).toBe(100); // Should round to 100% for single category
    });

    it("should calculate net amount (expenses - refunds)", async () => {
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

      mockTransactionRepository.findActiveByUserId.mockResolvedValue([
        expenseTransaction,
        refundTransaction,
      ]);

      mockCategoryRepository.findActiveById.mockResolvedValue(
        fakeCategory({ id: categoryId }),
      );

      const result = await reportService.call(
        userId,
        2025,
        11,
        ReportType.EXPENSE,
      );

      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].currencyBreakdowns[0].totalAmount).toBe(800); // 1000 - 200
      expect(result.currencyTotals[0].totalAmount).toBe(800);
    });

    it("should handle negative net amount (refunds > expenses)", async () => {
      const categoryId = uuidv4();
      const refundTransaction = fakeTransaction({
        categoryId,
        type: TransactionType.REFUND,
        amount: 300,
        currency: "EUR",
      });

      mockTransactionRepository.findActiveByUserId.mockResolvedValue([
        refundTransaction,
      ]);

      mockCategoryRepository.findActiveById.mockResolvedValue(
        fakeCategory({ id: categoryId }),
      );

      const result = await reportService.call(
        userId,
        2025,
        11,
        ReportType.EXPENSE,
      );

      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].currencyBreakdowns[0].totalAmount).toBe(-300);
      expect(result.currencyTotals[0].totalAmount).toBe(-300);
    });

    it("should not factor refunds for INCOME reports", async () => {
      const categoryId = uuidv4();
      const incomeTransaction = fakeTransaction({
        categoryId,
        type: TransactionType.INCOME,
        amount: 500,
        currency: "EUR",
      });

      mockTransactionRepository.findActiveByUserId.mockResolvedValue([
        incomeTransaction,
      ]);

      mockCategoryRepository.findActiveById.mockResolvedValue(
        fakeCategory({ id: categoryId }),
      );

      const result = await reportService.call(
        userId,
        2025,
        11,
        ReportType.INCOME,
      );

      expect(mockTransactionRepository.findActiveByUserId).toHaveBeenCalledWith(
        userId,
        {
          dateAfter: "2025-11-01",
          dateBefore: "2025-11-30",
          types: [TransactionType.INCOME], // Only INCOME, no REFUND
        },
      );
      expect(result.categories[0].currencyBreakdowns[0].totalAmount).toBe(500);
    });

    it("should handle multiple currencies with refunds", async () => {
      const categoryId = uuidv4();
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

      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        transactions,
      );

      mockCategoryRepository.findActiveById.mockResolvedValue(
        fakeCategory({ id: categoryId }),
      );

      const result = await reportService.call(
        userId,
        2025,
        11,
        ReportType.EXPENSE,
      );

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

    it("should handle uncategorized transactions with refunds", async () => {
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

      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        transactions,
      );

      const result = await reportService.call(
        userId,
        2025,
        11,
        ReportType.EXPENSE,
      );

      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].categoryName).toBe("Uncategorized");
      expect(result.categories[0].currencyBreakdowns[0].totalAmount).toBe(500); // 600 - 100
    });

    it("should exclude transactions in excluded categories from report", async () => {
      const includedCategory = fakeCategory({
        userId,
        name: "Groceries",
        excludeFromReports: false,
      });
      const excludedCategory = fakeCategory({
        userId,
        excludeFromReports: true,
      });

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

      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        transactions,
      );
      mockCategoryRepository.findActiveByUserId.mockResolvedValue([
        includedCategory,
        excludedCategory,
      ]);
      mockCategoryRepository.findActiveById.mockResolvedValueOnce(
        includedCategory,
      );

      const result = await reportService.call(
        userId,
        2000,
        1,
        ReportType.EXPENSE,
      );

      expect(result.currencyTotals).toHaveLength(1);
      expect(result.currencyTotals[0].totalAmount).toBe(300); // 100 + 200, excluding
      expect(
        result.categories.map((category) => category.categoryName).sort(),
      ).toEqual(["Groceries", "Uncategorized"]);
    });
  });

  describe("yearly report (month=undefined)", () => {
    it("should use full-year date range when month is undefined", async () => {
      mockTransactionRepository.findActiveByUserId.mockResolvedValue([]);

      await reportService.call(userId, 2000, undefined, ReportType.EXPENSE);

      expect(mockTransactionRepository.findActiveByUserId).toHaveBeenCalledWith(
        userId,
        {
          dateAfter: "2000-01-01",
          dateBefore: "2000-12-31",
          types: [TransactionType.EXPENSE, TransactionType.REFUND],
        },
      );
    });

    it("should return month as undefined in yearly report result", async () => {
      mockTransactionRepository.findActiveByUserId.mockResolvedValue([]);

      const result = await reportService.call(
        userId,
        2000,
        undefined,
        ReportType.EXPENSE,
      );

      expect(result.month).toBeUndefined();
      expect(result.year).toBe(2000);
    });

    it("should calculate currency totals correctly", async () => {
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

      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        transactions,
      );
      mockCategoryRepository.findActiveById.mockResolvedValue(fakeCategory());

      const result = await reportService.call(
        userId,
        2000,
        undefined,
        ReportType.EXPENSE,
      );

      expect(result.currencyTotals).toEqual([
        { currency: "EUR", totalAmount: 300 },
      ]);
    });
  });

  describe("validation", () => {
    describe("year validation", () => {
      it("should throw error for invalid year", async () => {
        await expect(
          reportService.call(userId, 2000.5, 1, ReportType.EXPENSE),
        ).rejects.toMatchObject({
          message: "Year must be a valid integer",
        });
      });

      it("should accept valid year within range", async () => {
        const currentYear = new Date().getFullYear();
        const validYear = currentYear - 50;

        mockTransactionRepository.findActiveByUserId.mockResolvedValue([]);

        await expect(
          reportService.call(userId, validYear, 1, ReportType.EXPENSE),
        ).resolves.toBeDefined();
      });
    });

    describe("month validation", () => {
      it("should throw error for invalid month", async () => {
        const currentYear = new Date().getFullYear();
        const invalidMonths = [0, 13, 5.5];

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

      it("should accept valid months (1-12)", async () => {
        const currentYear = new Date().getFullYear();

        mockTransactionRepository.findActiveByUserId.mockResolvedValue([]);

        for (let month = 1; month <= 12; month++) {
          await expect(
            reportService.call(userId, currentYear, month, ReportType.EXPENSE),
          ).resolves.toBeDefined();
        }
      });
    });
  });
});
