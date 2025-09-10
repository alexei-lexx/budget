import { ReportsService } from "./ReportsService";
import { ITransactionRepository, TransactionType } from "../models/Transaction";
import { ICategoryRepository } from "../models/Category";
import { fakeTransaction, fakeCategory } from "../__tests__/utils/factories";
import {
  createMockTransactionRepository,
  createMockCategoryRepository,
} from "../__tests__/utils/mockRepositories";
import { v4 as uuidv4 } from "uuid";
import { faker } from "@faker-js/faker";

describe("ReportsService", () => {
  let reportsService: ReportsService;
  let mockTransactionRepository: jest.Mocked<ITransactionRepository>;
  let mockCategoryRepository: jest.Mocked<ICategoryRepository>;

  const userId = uuidv4();

  beforeEach(() => {
    mockTransactionRepository = createMockTransactionRepository();
    mockCategoryRepository = createMockCategoryRepository();

    reportsService = new ReportsService(
      mockTransactionRepository,
      mockCategoryRepository,
    );
  });

  describe("getMonthlyReport", () => {
    it("should return empty report when no transactions exist", async () => {
      mockTransactionRepository.findActiveByMonthAndType.mockResolvedValue([]);

      const result = await reportsService.getMonthlyReport(
        userId,
        2000,
        1,
        TransactionType.EXPENSE,
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

      mockTransactionRepository.findActiveByMonthAndType.mockResolvedValue(
        transactions,
      );
      mockCategoryRepository.findActiveById
        .mockResolvedValueOnce(fakeCategory({ id: categoryId1, name: "Food" }))
        .mockResolvedValueOnce(
          fakeCategory({ id: categoryId2, name: "Transport" }),
        );

      const result = await reportsService.getMonthlyReport(
        userId,
        2000,
        1,
        TransactionType.EXPENSE,
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

      mockTransactionRepository.findActiveByMonthAndType.mockResolvedValue(
        transactions,
      );

      const result = await reportsService.getMonthlyReport(
        userId,
        2000,
        1,
        TransactionType.EXPENSE,
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

      mockTransactionRepository.findActiveByMonthAndType.mockResolvedValue(
        transactions,
      );
      mockCategoryRepository.findActiveById.mockResolvedValue(
        fakeCategory({ id: categoryId, name: "Food" }),
      );

      const result = await reportsService.getMonthlyReport(
        userId,
        2000,
        1,
        TransactionType.EXPENSE,
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

      mockTransactionRepository.findActiveByMonthAndType.mockResolvedValue(
        transactions,
      );

      const result = await reportsService.getMonthlyReport(
        userId,
        2000,
        1,
        TransactionType.EXPENSE,
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

      mockTransactionRepository.findActiveByMonthAndType.mockResolvedValue(
        transactions,
      );
      mockCategoryRepository.findActiveById.mockResolvedValue(null);

      const result = await reportsService.getMonthlyReport(
        userId,
        2000,
        1,
        TransactionType.EXPENSE,
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

      mockTransactionRepository.findActiveByMonthAndType.mockResolvedValue(
        transactions,
      );
      mockCategoryRepository.findActiveById
        .mockResolvedValueOnce(fakeCategory({ id: categoryId1, name: "Zebra" }))
        .mockResolvedValueOnce(
          fakeCategory({ id: categoryId2, name: "Apple" }),
        );

      const result = await reportsService.getMonthlyReport(
        userId,
        2000,
        1,
        TransactionType.EXPENSE,
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

      mockTransactionRepository.findActiveByMonthAndType.mockResolvedValue(
        transactions,
      );

      const result = await reportsService.getMonthlyReport(
        userId,
        2000,
        1,
        TransactionType.EXPENSE,
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

      mockTransactionRepository.findActiveByMonthAndType.mockResolvedValue(
        transactions,
      );

      const result = await reportsService.getMonthlyReport(
        userId,
        2000,
        1,
        TransactionType.EXPENSE,
      );

      const percentages = result.categories[0].currencyBreakdowns[0].percentage;
      expect(Number.isInteger(percentages)).toBe(true);
      expect(percentages).toBe(100); // Should round to 100% for single category
    });
  });
});
