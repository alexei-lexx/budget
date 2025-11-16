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
import { calculateCurrencyTotals } from "./reportCalculations";

// Re-export DayOfWeek for consumers
export { DayOfWeek };

export interface WeekdayReportCurrencyBreakdown {
  currency: string;
  totalAmount: number;
  averageAmount: number;
  percentage: number;
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

  constructor(private transactionRepository: ITransactionRepository) { }

  async call(
    userId: string,
    year: number,
    month: number,
    type: TransactionType,
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

    const currencyTotals = calculateCurrencyTotals(transactions);
    const weekdays = this.buildWeekdayBreakdowns(
      transactions,
      year,
      month,
      currencyTotals,
    );

    return {
      year,
      month,
      type,
      weekdays,
      currencyTotals,
    };
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
  ): WeekdayReportCurrencyBreakdown[] {
    const currencyBreakdowns: WeekdayReportCurrencyBreakdown[] = [];

    for (const [currency, weekdayTransactions] of currencyMap) {
      const totalAmount = weekdayTransactions.reduce(
        (sum, t) => sum + t.amount,
        0,
      );
      const occurrences = getWeekdayOccurrencesInMonth(year, month, dayOfWeek);
      const averageAmount = totalAmount / occurrences;

      const currencyTotal = currencyTotals.find(
        (ct) => ct.currency === currency,
      );
      const percentage = this.calculatePercentage(
        totalAmount,
        currencyTotal?.totalAmount || 0,
      );

      currencyBreakdowns.push({
        currency,
        totalAmount,
        averageAmount,
        percentage,
      });
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
