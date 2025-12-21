import { faker } from "@faker-js/faker";
import { v4 as uuidv4 } from "uuid";
import { fakeCategory, fakeTransaction } from "../__tests__/utils/factories";
import {
  createMockCategoryRepository,
  createMockTransactionRepository,
} from "../__tests__/utils/mockRepositories";
import { ICategoryRepository } from "../models/Category";
import { ReportType } from "../models/Report";
import { ITransactionRepository, TransactionType } from "../models/Transaction";
import { MonthlyByCategoryReportService } from "./MonthlyByCategoryReportService";

describe("MonthlyByCategoryReportService", () => {
  let monthlyByCategoryReportService: MonthlyByCategoryReportService;
  let mockTransactionRepository: jest.Mocked<ITransactionRepository>;
  let mockCategoryRepository: jest.Mocked<ICategoryRepository>;

  const userId = uuidv4();

  beforeEach(() => {
    mockTransactionRepository = createMockTransactionRepository();
    mockCategoryRepository = createMockCategoryRepository();

    monthlyByCategoryReportService = new MonthlyByCategoryReportService(
      mockTransactionRepository,
      mockCategoryRepository,
    );
  });

  describe("call", () => {
    it("should return empty report when no transactions exist", async () => {
      mockTransactionRepository.findActiveByMonthAndTypes.mockResolvedValue([]);

      const result = await monthlyByCategoryReportService.call(
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

      mockTransactionRepository.findActiveByMonthAndTypes.mockResolvedValue(
        transactions,
      );
      mockCategoryRepository.findActiveById
        .mockResolvedValueOnce(fakeCategory({ id: categoryId1, name: "Food" }))
        .mockResolvedValueOnce(
          fakeCategory({ id: categoryId2, name: "Transport" }),
        );

      const result = await monthlyByCategoryReportService.call(
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
    });

    it("should calculate currency totals correctly", async () => {
      const transactions = [
        fakeTransaction({ currency: "USD", amount: 100 }),
        fakeTransaction({ currency: "USD", amount: 200 }),
        fakeTransaction({ currency: "EUR", amount: 150 }),
      ];

      mockTransactionRepository.findActiveByMonthAndTypes.mockResolvedValue(
        transactions,
      );

      const result = await monthlyByCategoryReportService.call(
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

      mockTransactionRepository.findActiveByMonthAndTypes.mockResolvedValue(
        transactions,
      );
      mockCategoryRepository.findActiveById.mockResolvedValue(
        fakeCategory({ id: categoryId, name: "Food" }),
      );

      const result = await monthlyByCategoryReportService.call(
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

      mockTransactionRepository.findActiveByMonthAndTypes.mockResolvedValue(
        transactions,
      );

      const result = await monthlyByCategoryReportService.call(
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

      mockTransactionRepository.findActiveByMonthAndTypes.mockResolvedValue(
        transactions,
      );
      mockCategoryRepository.findActiveById.mockResolvedValue(null);

      const result = await monthlyByCategoryReportService.call(
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

      mockTransactionRepository.findActiveByMonthAndTypes.mockResolvedValue(
        transactions,
      );
      mockCategoryRepository.findActiveById
        .mockResolvedValueOnce(fakeCategory({ id: categoryId1, name: "Zebra" }))
        .mockResolvedValueOnce(
          fakeCategory({ id: categoryId2, name: "Apple" }),
        );

      const result = await monthlyByCategoryReportService.call(
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

      mockTransactionRepository.findActiveByMonthAndTypes.mockResolvedValue(
        transactions,
      );

      const result = await monthlyByCategoryReportService.call(
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

      mockTransactionRepository.findActiveByMonthAndTypes.mockResolvedValue(
        transactions,
      );

      const result = await monthlyByCategoryReportService.call(
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

      mockTransactionRepository.findActiveByMonthAndTypes.mockResolvedValue([
        expenseTransaction,
        refundTransaction,
      ]);

      mockCategoryRepository.findActiveById.mockResolvedValue(
        fakeCategory({ id: categoryId }),
      );

      const result = await monthlyByCategoryReportService.call(
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

      mockTransactionRepository.findActiveByMonthAndTypes.mockResolvedValue([
        refundTransaction,
      ]);

      mockCategoryRepository.findActiveById.mockResolvedValue(
        fakeCategory({ id: categoryId }),
      );

      const result = await monthlyByCategoryReportService.call(
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

      mockTransactionRepository.findActiveByMonthAndTypes.mockResolvedValue([
        incomeTransaction,
      ]);

      mockCategoryRepository.findActiveById.mockResolvedValue(
        fakeCategory({ id: categoryId }),
      );

      const result = await monthlyByCategoryReportService.call(
        userId,
        2025,
        11,
        ReportType.INCOME,
      );

      expect(
        mockTransactionRepository.findActiveByMonthAndTypes,
      ).toHaveBeenCalledWith(
        userId,
        2025,
        11,
        [TransactionType.INCOME], // Only INCOME, no REFUND
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

      mockTransactionRepository.findActiveByMonthAndTypes.mockResolvedValue(
        transactions,
      );

      mockCategoryRepository.findActiveById.mockResolvedValue(
        fakeCategory({ id: categoryId }),
      );

      const result = await monthlyByCategoryReportService.call(
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

      mockTransactionRepository.findActiveByMonthAndTypes.mockResolvedValue(
        transactions,
      );

      const result = await monthlyByCategoryReportService.call(
        userId,
        2025,
        11,
        ReportType.EXPENSE,
      );

      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].categoryName).toBe("Uncategorized");
      expect(result.categories[0].currencyBreakdowns[0].totalAmount).toBe(500); // 600 - 100
    });
  });
});
