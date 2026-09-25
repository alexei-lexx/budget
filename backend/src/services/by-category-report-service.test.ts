import { faker } from "@faker-js/faker";
import { v4 as uuidv4 } from "uuid";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { TransactionType } from "../models/transaction";
import { CategoryRepository } from "../ports/category-repository";
import { TransactionRepository } from "../ports/transaction-repository";
import { toDateString } from "../types/date-string";
import { fakeCategory } from "../utils/test-utils/models/category-fakes";
import {
  fakeExpense,
  fakeIncome,
  fakeRefund,
  fakeTransaction,
} from "../utils/test-utils/models/transaction-fakes";
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
      const result = await reportService.call(userId, 2000, 1, "EXPENSE");

      // Assert
      expect(result).toEqualSuccess({
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
      mockTransactionRepository.findManyByUserId.mockResolvedValue([
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
      ]);

      // Resolve each categoryId in order to its named category
      mockCategoryRepository.findOneById
        .mockResolvedValueOnce(fakeCategory({ id: categoryId1, name: "Food" }))
        .mockResolvedValueOnce(
          fakeCategory({ id: categoryId2, name: "Transport" }),
        );

      // Act
      const result = await reportService.call(userId, 2000, 1, "EXPENSE");

      // Assert
      // topTransactions and totalTransactionCount populated per category
      expect(result).toEqualSuccess(
        expect.objectContaining({
          categories: [
            expect.objectContaining({
              categoryName: "Food",
              topTransactions: expect.any(Array),
              totalTransactionCount: expect.any(Number),
            }),
            expect.objectContaining({
              categoryName: "Transport",
              topTransactions: expect.any(Array),
              totalTransactionCount: expect.any(Number),
            }),
            expect.objectContaining({
              categoryName: "Uncategorized",
              topTransactions: expect.any(Array),
              totalTransactionCount: expect.any(Number),
            }),
          ],
        }),
      );
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
      const result = await reportService.call(userId, 2000, 1, "EXPENSE");

      // Assert
      // Top 5 transactions only, sorted by amount descending
      expect(result).toEqualSuccess(
        expect.objectContaining({
          categories: [
            expect.objectContaining({
              totalTransactionCount: 7,
              topTransactions: [
                expect.objectContaining({ amount: 500 }),
                expect.objectContaining({ amount: 400 }),
                expect.objectContaining({ amount: 300 }),
                expect.objectContaining({ amount: 200 }),
                expect.objectContaining({ amount: 150 }),
              ],
            }),
          ],
        }),
      );
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
      const result = await reportService.call(userId, 2000, 1, "EXPENSE");

      // Assert
      expect(result).toEqualSuccess(
        expect.objectContaining({
          currencyTotals: [
            { currency: "EUR", totalAmount: 150 },
            { currency: "USD", totalAmount: 300 },
          ],
        }),
      );
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
      const result = await reportService.call(userId, 2000, 1, "EXPENSE");

      // Assert
      // Categories sorted alphabetically: Food, Uncategorized
      expect(result).toEqualSuccess(
        expect.objectContaining({
          categories: [
            expect.objectContaining({
              categoryName: "Food",
              currencyBreakdowns: [
                expect.objectContaining({ percentage: 25 }), // 100/400 = 25%
              ],
            }),
            expect.objectContaining({
              categoryName: "Uncategorized",
              currencyBreakdowns: [
                expect.objectContaining({ percentage: 75 }), // 300/400 = 75%
              ],
            }),
          ],
        }),
      );
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
      const result = await reportService.call(userId, 2000, 1, "EXPENSE");

      // Assert
      expect(result).toEqualSuccess(
        expect.objectContaining({
          categories: [
            expect.objectContaining({
              categoryName: "Uncategorized",
              categoryId: undefined,
              currencyBreakdowns: [expect.any(Object), expect.any(Object)],
            }),
          ],
        }),
      );
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
      const result = await reportService.call(userId, 2000, 1, "EXPENSE");

      // Assert
      expect(result).toEqualSuccess(
        expect.objectContaining({
          categories: [
            expect.objectContaining({ categoryName: "Uncategorized" }),
          ],
        }),
      );
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
      const result = await reportService.call(userId, 2000, 1, "EXPENSE");

      // Assert
      expect(result).toEqualSuccess(
        expect.objectContaining({
          categories: [
            expect.objectContaining({ categoryName: "Apple" }),
            expect.objectContaining({ categoryName: "Uncategorized" }),
            expect.objectContaining({ categoryName: "Zebra" }),
          ],
        }),
      );
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
      const result = await reportService.call(userId, 2000, 1, "EXPENSE");

      // Assert
      expect(result).toEqualSuccess(
        expect.objectContaining({
          currencyTotals: [
            expect.objectContaining({ currency: "EUR" }),
            expect.objectContaining({ currency: "GBP" }),
            expect.objectContaining({ currency: "USD" }),
          ],
          categories: [
            expect.objectContaining({
              currencyBreakdowns: [
                expect.objectContaining({ currency: "EUR" }),
                expect.objectContaining({ currency: "GBP" }),
                expect.objectContaining({ currency: "USD" }),
              ],
            }),
          ],
        }),
      );
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
      const result = await reportService.call(userId, 2000, 1, "EXPENSE");

      // Assert
      expect(result).toEqualSuccess(
        expect.objectContaining({
          categories: [
            expect.objectContaining({
              currencyBreakdowns: [
                expect.objectContaining({ percentage: 100 }), // Rounds to 100% for single category
              ],
            }),
          ],
        }),
      );
    });

    it("calculates net amount as expenses minus refunds", async () => {
      // Arrange
      const categoryId = uuidv4();
      const expenseTransaction = fakeExpense({
        categoryId,
        amount: 1000,
        currency: "EUR",
      });
      const refundTransaction = fakeRefund({
        categoryId,
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
      const result = await reportService.call(userId, 2025, 11, "EXPENSE");

      // Assert
      expect(result).toEqualSuccess(
        expect.objectContaining({
          categories: [
            expect.objectContaining({
              currencyBreakdowns: [
                expect.objectContaining({ totalAmount: 800 }), // 1000 - 200
              ],
            }),
          ],
          currencyTotals: [expect.objectContaining({ totalAmount: 800 })],
        }),
      );
    });

    it("returns negative net amount when refunds exceed expenses", async () => {
      // Arrange
      const categoryId = uuidv4();
      const refundTransaction = fakeRefund({
        categoryId,
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
      const result = await reportService.call(userId, 2025, 11, "EXPENSE");

      // Assert
      expect(result).toEqualSuccess(
        expect.objectContaining({
          categories: [
            expect.objectContaining({
              currencyBreakdowns: [
                expect.objectContaining({ totalAmount: -300 }),
              ],
            }),
          ],
          currencyTotals: [expect.objectContaining({ totalAmount: -300 })],
        }),
      );
    });

    it("does not factor refunds for INCOME reports", async () => {
      // Arrange
      const categoryId = uuidv4();
      const incomeTransaction = fakeIncome({
        categoryId,
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
      const result = await reportService.call(userId, 2025, 11, "INCOME");

      // Assert
      expect(result).toEqualSuccess(
        expect.objectContaining({
          categories: [
            expect.objectContaining({
              currencyBreakdowns: [
                expect.objectContaining({ totalAmount: 500 }),
              ],
            }),
          ],
        }),
      );
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
        fakeExpense({
          categoryId,
          amount: 1000,
          currency: "EUR",
        }),
        fakeRefund({
          categoryId,
          amount: 200,
          currency: "EUR",
        }),
        fakeExpense({
          categoryId,
          amount: 500,
          currency: "USD",
        }),
        fakeRefund({
          categoryId,
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
      const result = await reportService.call(userId, 2025, 11, "EXPENSE");

      // Assert
      // Currency breakdowns sorted alphabetically: EUR, USD
      expect(result).toEqualSuccess(
        expect.objectContaining({
          categories: [
            expect.objectContaining({
              currencyBreakdowns: [
                expect.objectContaining({
                  currency: "EUR",
                  totalAmount: 800, // 1000 - 200
                }),
                expect.objectContaining({
                  currency: "USD",
                  totalAmount: 400, // 500 - 100
                }),
              ],
            }),
          ],
        }),
      );
    });

    it("handles uncategorized transactions with refunds", async () => {
      // Arrange
      // Uncategorized expense and refund in same currency
      const transactions = [
        fakeExpense({
          categoryId: undefined,
          amount: 600,
          currency: "EUR",
        }),
        fakeRefund({
          categoryId: undefined,
          amount: 100,
          currency: "EUR",
        }),
      ];
      mockTransactionRepository.findManyByUserId.mockResolvedValue(
        transactions,
      );

      // Act
      const result = await reportService.call(userId, 2025, 11, "EXPENSE");

      // Assert
      expect(result).toEqualSuccess(
        expect.objectContaining({
          categories: [
            expect.objectContaining({
              categoryName: "Uncategorized",
              currencyBreakdowns: [
                expect.objectContaining({ totalAmount: 500 }), // 600 - 100
              ],
            }),
          ],
        }),
      );
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
        fakeExpense({
          categoryId: undefined,
          currency: "USD",
          amount: 100,
        }),
        fakeExpense({
          categoryId: includedCategory.id,
          currency: "USD",
          amount: 200,
        }),
        fakeExpense({
          categoryId: excludedCategory.id,
          currency: "USD",
          amount: 500,
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
      const result = await reportService.call(userId, 2000, 1, "EXPENSE");

      // Assert
      // Categories sorted alphabetically: Groceries, Uncategorized
      expect(result).toEqualSuccess(
        expect.objectContaining({
          currencyTotals: [
            expect.objectContaining({ totalAmount: 300 }), // 100 + 200, excluding 500
          ],
          categories: [
            expect.objectContaining({ categoryName: "Groceries" }),
            expect.objectContaining({ categoryName: "Uncategorized" }),
          ],
        }),
      );
    });

    it("succeeds for months 1 through 12", async () => {
      // Arrange
      const currentYear = new Date().getFullYear();

      // No transactions in any month
      mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

      // Act & Assert
      for (let month = 1; month <= 12; month++) {
        const result = await reportService.call(
          userId,
          currentYear,
          month,
          "EXPENSE",
        );
        expect(result).toEqualSuccess();
      }
    });

    // Validation failures

    it("fails when year is not integer", async () => {
      // Act
      const result = await reportService.call(userId, 2000.5, 1, "EXPENSE");

      // Assert
      expect(result).toEqualFailure("Year must be a valid integer");
    });

    it("fails when year < 1000", async () => {
      // Arrange
      mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

      // Act
      const result = await reportService.call(userId, 999, 1, "EXPENSE");

      // Assert
      expect(result).toEqualFailure("Year must be a valid integer");
    });

    it("fails when year > 9999", async () => {
      // Arrange
      mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

      // Act
      const result = await reportService.call(userId, 10000, 1, "EXPENSE");

      // Assert
      expect(result).toEqualFailure("Year must be a valid integer");
    });

    it("fails when month is out of range or fractional", async () => {
      // Arrange
      const currentYear = new Date().getFullYear();
      const invalidMonths = [0, 13, 5.5];

      // Act & Assert
      for (const invalidMonth of invalidMonths) {
        const result = await reportService.call(
          userId,
          currentYear,
          invalidMonth,
          "EXPENSE",
        );
        expect(result).toEqualFailure(
          "Month must be a valid integer between 1 and 12",
        );
      }
    });

    describe("when month is undefined", () => {
      // Happy path

      it("uses full-year date range", async () => {
        // Arrange
        // No transactions in full-year range
        mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

        // Act
        await reportService.call(userId, 2000, undefined, "EXPENSE");

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
          "EXPENSE",
        );

        // Assert
        expect(result).toEqualSuccess(
          expect.objectContaining({ month: undefined, year: 2000 }),
        );
      });

      it("calculates currency totals across full year", async () => {
        // Arrange
        // Two expense transactions in same currency
        const transactions = [
          fakeExpense({
            amount: 100,
            currency: "EUR",
          }),
          fakeExpense({
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
          "EXPENSE",
        );

        // Assert
        expect(result).toEqualSuccess(
          expect.objectContaining({
            currencyTotals: [{ currency: "EUR", totalAmount: 300 }],
          }),
        );
      });
    });
  });
});
