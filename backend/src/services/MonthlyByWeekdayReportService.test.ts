import { v4 as uuidv4 } from "uuid";
import { fakeTransaction } from "../__tests__/utils/factories";
import { createMockTransactionRepository } from "../__tests__/utils/mockRepositories";
import { ITransactionRepository, TransactionType } from "../models/Transaction";
import {
  MonthlyByWeekdayReportService,
  DayOfWeek,
} from "./MonthlyByWeekdayReportService";

describe("MonthlyByWeekdayReportService", () => {
  let monthlyByWeekdayReportService: MonthlyByWeekdayReportService;
  let mockTransactionRepository: jest.Mocked<ITransactionRepository>;

  const userId = uuidv4();

  beforeEach(() => {
    mockTransactionRepository = createMockTransactionRepository();
    monthlyByWeekdayReportService = new MonthlyByWeekdayReportService(
      mockTransactionRepository,
    );
  });

  describe("call", () => {
    it("should return empty report when no expenses exist", async () => {
      mockTransactionRepository.findActiveByMonthAndTypes.mockResolvedValue([]);

      const result = await monthlyByWeekdayReportService.call(
        userId,
        2025,
        11,
        TransactionType.EXPENSE,
      );

      expect(result).toEqual({
        year: 2025,
        month: 11,
        type: TransactionType.EXPENSE,
        weekdays: [],
        currencyTotals: [],
      });
    });

    it("should aggregate expenses by weekday for single currency", async () => {
      // Use consistent dates on specific weekdays to verify grouping works
      const transactions = [
        fakeTransaction({
          date: "2025-01-06", // Monday in January 2025
          currency: "USD",
          amount: 100,
        }),
        fakeTransaction({
          date: "2025-01-13", // Monday in January 2025
          currency: "USD",
          amount: 150,
        }),
        fakeTransaction({
          date: "2025-01-07", // Tuesday in January 2025
          currency: "USD",
          amount: 200,
        }),
      ];

      mockTransactionRepository.findActiveByMonthAndTypes.mockResolvedValue(
        transactions,
      );

      const result = await monthlyByWeekdayReportService.call(
        userId,
        2025,
        1,
        TransactionType.EXPENSE,
      );

      // Verify weekdays with data exist
      expect(result.weekdays.length).toBe(2);

      // Verify each weekday has valid breakdown
      expect(result.weekdays[0].dayOfWeek).toBe(DayOfWeek.MONDAY);
      expect(result.weekdays[0].currencyBreakdowns[0].currency).toBe("USD");
      expect(result.weekdays[0].currencyBreakdowns[0].totalAmount).toBe(250); // 100 + 150
      expect(result.weekdays[0].currencyBreakdowns[0].averageAmount).toBe(62.5); // 250 / 4 Mondays
      expect(result.weekdays[0].currencyBreakdowns[0].percentage).toBe(56); // 250/450 * 100
      expect(result.weekdays[1].dayOfWeek).toBe(DayOfWeek.TUESDAY);
      expect(result.weekdays[1].currencyBreakdowns[0].currency).toBe("USD");
      expect(result.weekdays[1].currencyBreakdowns[0].totalAmount).toBe(200); // 200
      expect(result.weekdays[1].currencyBreakdowns[0].averageAmount).toBe(50); // 200 / 4 Tuesdays
      expect(result.weekdays[1].currencyBreakdowns[0].percentage).toBe(44); // 200/450 * 100
    });

    it("should handle multiple currencies with separate breakdowns", async () => {
      const transactions = [
        fakeTransaction({
          date: "2025-11-03", // Monday
          currency: "USD",
          amount: 100,
        }),
        fakeTransaction({
          date: "2025-11-03", // Monday
          currency: "EUR",
          amount: 50,
        }),
        fakeTransaction({
          date: "2025-11-04", // Tuesday
          currency: "USD",
          amount: 200,
        }),
        fakeTransaction({
          date: "2025-11-04", // Tuesday
          currency: "EUR",
          amount: 80,
        }),
      ];

      mockTransactionRepository.findActiveByMonthAndTypes.mockResolvedValue(
        transactions,
      );

      const result = await monthlyByWeekdayReportService.call(
        userId,
        2025,
        11,
        TransactionType.EXPENSE,
      );

      // Check Monday has both USD and EUR
      const mondayData = result.weekdays.find(
        (w) => w.dayOfWeek === DayOfWeek.MONDAY,
      );

      expect(mondayData?.currencyBreakdowns).toHaveLength(2);
      expect(mondayData?.currencyBreakdowns[0].currency).toBe("EUR");
      expect(mondayData?.currencyBreakdowns[1].currency).toBe("USD");

      // Check percentages are between 0-100 and sum appropriately
      const usdBreakdown = mondayData?.currencyBreakdowns.find(
        (cb) => cb.currency === "USD",
      );
      expect(usdBreakdown?.percentage).toBeGreaterThan(0);
      expect(usdBreakdown?.percentage).toBeLessThanOrEqual(100);

      const eurBreakdown = mondayData?.currencyBreakdowns.find(
        (cb) => cb.currency === "EUR",
      );
      expect(eurBreakdown?.percentage).toBeGreaterThan(0);
      expect(eurBreakdown?.percentage).toBeLessThanOrEqual(100);

      // Check currency totals
      expect(result.currencyTotals).toHaveLength(2);
      expect(result.currencyTotals).toContainEqual({
        currency: "EUR",
        totalAmount: 130,
      });
      expect(result.currencyTotals).toContainEqual({
        currency: "USD",
        totalAmount: 300,
      });
    });

    describe("outlier filtering (excludeOutliers=true)", () => {
      it("should exclude statistical outliers from totals and averages", async () => {
        // Monday transactions: regular expenses + one outlier (rent)
        const transactions = [
          fakeTransaction({
            date: "2025-01-06", // Monday
            currency: "USD",
            amount: 100,
          }),
          fakeTransaction({
            date: "2025-01-13", // Monday
            currency: "USD",
            amount: 120,
          }),
          fakeTransaction({
            date: "2025-01-20", // Monday
            currency: "USD",
            amount: 110,
          }),
          fakeTransaction({
            date: "2025-01-27", // Monday
            currency: "USD",
            amount: 1500, // Outlier (rent)
          }),
        ];

        mockTransactionRepository.findActiveByMonthAndTypes.mockResolvedValue(
          transactions,
        );

        const result = await monthlyByWeekdayReportService.call(
          userId,
          2025,
          1,
          TransactionType.EXPENSE,
          true, // excludeOutliers = true
        );

        const mondayReport = result.weekdays[0];
        const usdBreakdown = mondayReport.currencyBreakdowns[0];

        // With filtering: outlier excluded
        expect(usdBreakdown.totalAmount).toBe(330); // 100 + 120 + 110
        expect(usdBreakdown.averageAmount).toBeCloseTo(82.5, 1); // 330 / 4 Mondays

        // Outlier information should be present
        expect(usdBreakdown.outlierCount).toBe(1);
        expect(usdBreakdown.outlierTotalAmount).toBe(1500);
      });

      it("should apply IQR separately per currency", async () => {
        const transactions = [
          // USD: regular + outlier
          fakeTransaction({ date: "2025-01-06", currency: "USD", amount: 100 }),
          fakeTransaction({ date: "2025-01-06", currency: "USD", amount: 110 }),
          fakeTransaction({ date: "2025-01-06", currency: "USD", amount: 120 }),
          fakeTransaction({
            date: "2025-01-06",
            currency: "USD",
            amount: 1500,
          }), // Outlier
          // EUR: all regular (no outliers)
          fakeTransaction({ date: "2025-01-06", currency: "EUR", amount: 50 }),
          fakeTransaction({ date: "2025-01-06", currency: "EUR", amount: 55 }),
          fakeTransaction({ date: "2025-01-06", currency: "EUR", amount: 52 }),
          fakeTransaction({ date: "2025-01-06", currency: "EUR", amount: 58 }),
        ];

        mockTransactionRepository.findActiveByMonthAndTypes.mockResolvedValue(
          transactions,
        );

        const result = await monthlyByWeekdayReportService.call(
          userId,
          2025,
          1,
          TransactionType.EXPENSE,
          true,
        );

        const mondayReport = result.weekdays[0];
        const usdBreakdown = mondayReport.currencyBreakdowns.find(
          (b) => b.currency === "USD",
        );
        const eurBreakdown = mondayReport.currencyBreakdowns.find(
          (b) => b.currency === "EUR",
        );

        // USD should have outlier detected
        expect(usdBreakdown?.outlierCount).toBe(1);
        expect(usdBreakdown?.outlierTotalAmount).toBe(1500);

        // EUR should have no outliers
        expect(eurBreakdown?.outlierCount).toBeUndefined();
        expect(eurBreakdown?.outlierTotalAmount).toBeUndefined();
      });

      it("should not filter when fewer than 4 transactions", async () => {
        const transactions = [
          fakeTransaction({ date: "2025-01-06", currency: "USD", amount: 100 }),
          fakeTransaction({ date: "2025-01-13", currency: "USD", amount: 200 }),
          fakeTransaction({
            date: "2025-01-20",
            currency: "USD",
            amount: 1500,
          }), // Would be outlier if enough data
        ];

        mockTransactionRepository.findActiveByMonthAndTypes.mockResolvedValue(
          transactions,
        );

        const result = await monthlyByWeekdayReportService.call(
          userId,
          2025,
          1,
          TransactionType.EXPENSE,
          true,
        );

        const mondayReport = result.weekdays[0];
        const usdBreakdown = mondayReport.currencyBreakdowns[0];

        // All transactions included (insufficient data for IQR)
        expect(usdBreakdown.totalAmount).toBe(1800);
        expect(usdBreakdown.outlierCount).toBeUndefined();
      });

      it("should not populate outlier fields when no outliers detected", async () => {
        const transactions = [
          fakeTransaction({ date: "2025-01-06", currency: "USD", amount: 100 }),
          fakeTransaction({ date: "2025-01-13", currency: "USD", amount: 110 }),
          fakeTransaction({ date: "2025-01-20", currency: "USD", amount: 105 }),
          fakeTransaction({ date: "2025-01-27", currency: "USD", amount: 115 }),
        ];

        mockTransactionRepository.findActiveByMonthAndTypes.mockResolvedValue(
          transactions,
        );

        const result = await monthlyByWeekdayReportService.call(
          userId,
          2025,
          1,
          TransactionType.EXPENSE,
          true,
        );

        const mondayReport = result.weekdays[0];
        const usdBreakdown = mondayReport.currencyBreakdowns[0];

        // All similar values, no outliers
        expect(usdBreakdown.outlierCount).toBeUndefined();
        expect(usdBreakdown.outlierTotalAmount).toBeUndefined();
      });

      it("should handle multiple outliers correctly", async () => {
        const transactions = [
          // More regular values to establish proper baseline
          fakeTransaction({ date: "2025-01-06", currency: "USD", amount: 20 }),
          fakeTransaction({ date: "2025-01-13", currency: "USD", amount: 25 }),
          fakeTransaction({ date: "2025-01-20", currency: "USD", amount: 30 }),
          fakeTransaction({ date: "2025-01-27", currency: "USD", amount: 35 }),
          fakeTransaction({ date: "2025-01-06", currency: "USD", amount: 40 }),
          fakeTransaction({ date: "2025-01-13", currency: "USD", amount: 45 }),
          fakeTransaction({ date: "2025-01-20", currency: "USD", amount: 50 }),
          fakeTransaction({ date: "2025-01-27", currency: "USD", amount: 55 }),
          fakeTransaction({
            date: "2025-01-13",
            currency: "USD",
            amount: 1200,
          }), // Outlier 1
          fakeTransaction({
            date: "2025-01-20",
            currency: "USD",
            amount: 1500,
          }), // Outlier 2
        ];

        mockTransactionRepository.findActiveByMonthAndTypes.mockResolvedValue(
          transactions,
        );

        const result = await monthlyByWeekdayReportService.call(
          userId,
          2025,
          1,
          TransactionType.EXPENSE,
          true,
        );

        const mondayReport = result.weekdays[0];
        const usdBreakdown = mondayReport.currencyBreakdowns[0];

        expect(usdBreakdown.outlierCount).toBeGreaterThanOrEqual(2);
        expect(usdBreakdown.outlierTotalAmount).toBeGreaterThan(2000);
      });
    });
  });
});
