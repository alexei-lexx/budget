import {
  ITransactionRepository,
  Transaction,
  TransactionType,
} from "../models/Transaction";
import {
  DayOfWeek,
  getDayOfWeek,
  getWeekdayOccurrencesInMonth,
} from "../utils/date";
import { calculateOutliers } from "../utils/statistics";
import { calculateCurrencyTotals } from "./reportCalculations";

// Re-export DayOfWeek for consumers
export { DayOfWeek };

export interface WeekdayReportCurrencyBreakdown {
  currency: string;
  totalAmount: number;
  averageAmount: number;
  percentage: number;
  outlierCount?: number;
  outlierTotalAmount?: number;
}

export interface WeekdayReportDay {
  dayOfWeek: DayOfWeek;
  currencyBreakdowns: WeekdayReportCurrencyBreakdown[];
}

export interface WeekdayReportCurrencyTotal {
  currency: string;
  totalAmount: number;
}

export interface WeekdayReport {
  year: number;
  month: number;
  type: TransactionType;
  weekdays: WeekdayReportDay[];
  currencyTotals: WeekdayReportCurrencyTotal[];
}

export class MonthlyByWeekdayReportService {
  // Order of weekdays for chart display (Mon-Sun)
  private readonly WEEKDAY_ORDER: DayOfWeek[] = [
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
    DayOfWeek.SUNDAY,
  ];

  constructor(private transactionRepository: ITransactionRepository) {}

  async call(
    userId: string,
    year: number,
    month: number,
    type: TransactionType,
    excludeOutliers = false,
  ): Promise<WeekdayReport> {
    const transactions =
      await this.transactionRepository.findActiveByMonthAndType(
        userId,
        year,
        month,
        type,
      );

    if (transactions.length === 0) {
      return {
        year,
        month,
        type,
        weekdays: [],
        currencyTotals: [],
      };
    }

    // Filter outliers if requested and group them by weekday+currency
    let normalTransactions: Transaction[];
    let outliersByWeekdayCurrency: Record<
      DayOfWeek,
      Record<string, { count: number; total: number }>
    >;

    if (excludeOutliers) {
      const { normal, outliers } =
        this.splitTransactionsByOutliers(transactions);
      normalTransactions = normal;
      outliersByWeekdayCurrency = this.groupOutliersByWeekdayCurrency(outliers);
    } else {
      normalTransactions = transactions;
      outliersByWeekdayCurrency = {} as Record<
        DayOfWeek,
        Record<string, { count: number; total: number }>
      >;
    }

    // Calculate currency totals from filtered transactions
    const currencyTotals = calculateCurrencyTotals(normalTransactions);

    // Build weekday breakdowns using filtered data
    const weekdays = this.buildWeekdayBreakdowns(
      normalTransactions,
      year,
      month,
      currencyTotals,
      outliersByWeekdayCurrency,
    );

    return {
      year,
      month,
      type,
      weekdays,
      currencyTotals,
    };
  }

  private splitTransactionsByOutliers(transactions: Transaction[]): {
    normal: Transaction[];
    outliers: Transaction[];
  } {
    const transactionsGroupedByCurrency: Record<string, Transaction[]> = {};
    for (const transaction of transactions) {
      const existing =
        transactionsGroupedByCurrency[transaction.currency] || [];
      existing.push(transaction);
      transactionsGroupedByCurrency[transaction.currency] = existing;
    }

    const normal: Transaction[] = [];
    const outliers: Transaction[] = [];

    // Apply outlier detection per currency for the whole month
    for (const currencyTransactions of Object.values(
      transactionsGroupedByCurrency,
    )) {
      const amounts = currencyTransactions.map((t) => t.amount);
      const outlierResult = calculateOutliers(amounts);

      // Separate normal and outlier transactions
      const normalAmountSet = new Set(outlierResult.normalAmounts);
      for (const transaction of currencyTransactions) {
        if (normalAmountSet.has(transaction.amount)) {
          normal.push(transaction);
          normalAmountSet.delete(transaction.amount); // Handle duplicates correctly
        } else {
          outliers.push(transaction);
        }
      }
    }

    return { normal, outliers };
  }

  private groupOutliersByWeekdayCurrency(
    outliers: Transaction[],
  ): Record<DayOfWeek, Record<string, { count: number; total: number }>> {
    const outliersByWeekdayCurrency: Partial<
      Record<DayOfWeek, Record<string, { count: number; total: number }>>
    > = {};

    for (const transaction of outliers) {
      const dayOfWeek = getDayOfWeek(transaction.date);
      const currency = transaction.currency;

      let currencyRecord = outliersByWeekdayCurrency[dayOfWeek];
      if (!currencyRecord) {
        currencyRecord = {};
        outliersByWeekdayCurrency[dayOfWeek] = currencyRecord;
      }

      const existing = currencyRecord[currency];
      if (existing) {
        existing.count += 1;
        existing.total += transaction.amount;
      } else {
        currencyRecord[currency] = {
          count: 1,
          total: transaction.amount,
        };
      }
    }

    return outliersByWeekdayCurrency as Record<
      DayOfWeek,
      Record<string, { count: number; total: number }>
    >;
  }

  private groupByWeekdayAndCurrency(
    transactions: Transaction[],
  ): Map<DayOfWeek, Map<string, Transaction[]>> {
    const weekdayMap = new Map<DayOfWeek, Map<string, Transaction[]>>();

    for (const transaction of transactions) {
      const dayOfWeek = getDayOfWeek(transaction.date);
      const currency = transaction.currency;

      let currencyMap = weekdayMap.get(dayOfWeek);
      if (!currencyMap) {
        currencyMap = new Map();
        weekdayMap.set(dayOfWeek, currencyMap);
      }

      let currencyTransactions = currencyMap.get(currency);
      if (!currencyTransactions) {
        currencyTransactions = [];
        currencyMap.set(currency, currencyTransactions);
      }

      currencyTransactions.push(transaction);
    }

    return weekdayMap;
  }

  private buildWeekdayBreakdowns(
    transactions: Transaction[],
    year: number,
    month: number,
    currencyTotals: WeekdayReportCurrencyTotal[],
    outliersByWeekdayCurrency: Record<
      DayOfWeek,
      Record<string, { count: number; total: number }>
    >,
  ): WeekdayReportDay[] {
    const weekdayMap = this.groupByWeekdayAndCurrency(transactions);
    const weekdays: WeekdayReportDay[] = [];

    for (const dayOfWeek of this.WEEKDAY_ORDER) {
      const currencyMap = weekdayMap.get(dayOfWeek);
      if (!currencyMap) {
        continue; // Skip weekdays with no transactions
      }

      const currencyBreakdowns = this.calculateWeekdayBreakdowns(
        currencyMap,
        year,
        month,
        dayOfWeek,
        currencyTotals,
        outliersByWeekdayCurrency,
      );

      weekdays.push({
        dayOfWeek,
        currencyBreakdowns,
      });
    }

    return weekdays;
  }

  private calculateWeekdayBreakdowns(
    currencyMap: Map<string, Transaction[]>,
    year: number,
    month: number,
    dayOfWeek: DayOfWeek,
    currencyTotals: WeekdayReportCurrencyTotal[],
    outliersByWeekdayCurrency: Record<
      DayOfWeek,
      Record<string, { count: number; total: number }>
    >,
  ): WeekdayReportCurrencyBreakdown[] {
    const currencyBreakdowns: WeekdayReportCurrencyBreakdown[] = [];

    for (const [currency, weekdayTransactions] of currencyMap) {
      // Calculate total from already-filtered transactions
      const totalAmount = weekdayTransactions.reduce(
        (sum, t) => sum + t.amount,
        0,
      );
      const occurrences = getWeekdayOccurrencesInMonth(year, month, dayOfWeek);
      const averageAmount = totalAmount / occurrences;

      // Get currency total for percentage calculation
      const currencyTotal = currencyTotals.find(
        (ct) => ct.currency === currency,
      );
      const percentage = this.calculatePercentage(
        totalAmount,
        currencyTotal?.totalAmount || 0,
      );

      const breakdown: WeekdayReportCurrencyBreakdown = {
        currency,
        totalAmount,
        averageAmount,
        percentage,
      };

      // Add outlier info if exists for THIS SPECIFIC weekday+currency combination
      const currencyOutliers = outliersByWeekdayCurrency[dayOfWeek];
      const outliers = currencyOutliers?.[currency];
      if (outliers) {
        breakdown.outlierCount = outliers.count;
        breakdown.outlierTotalAmount = outliers.total;
      }

      currencyBreakdowns.push(breakdown);
    }

    return currencyBreakdowns.sort((a, b) =>
      a.currency.localeCompare(b.currency),
    );
  }

  private calculatePercentage(
    weekdayTotal: number,
    currencyTotal: number,
  ): number {
    if (currencyTotal === 0) return 0;
    return Math.round((weekdayTotal / currencyTotal) * 100);
  }
}
