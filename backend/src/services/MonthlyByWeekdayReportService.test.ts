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

  describe("getWeekdayReport", () => {
    it("should return empty report when no expenses exist", async () => {
      mockTransactionRepository.findActiveByMonthAndType.mockResolvedValue([]);

      const result = await monthlyByWeekdayReportService.getWeekdayReport(
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

      mockTransactionRepository.findActiveByMonthAndType.mockResolvedValue(
        transactions,
      );

      const result = await monthlyByWeekdayReportService.getWeekdayReport(
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

      mockTransactionRepository.findActiveByMonthAndType.mockResolvedValue(
        transactions,
      );

      const result = await monthlyByWeekdayReportService.getWeekdayReport(
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
  });
});
