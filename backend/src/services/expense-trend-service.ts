import { Transaction, TransactionType } from "../models/transaction";
import { CategoryRepository } from "../ports/category-repository";
import { TransactionRepository } from "../ports/transaction-repository";
import { DateString, isDateString, toDateString } from "../types/date";
import { Failure, Result, Success } from "../types/result";
import { daysBetween } from "../utils/date";

const ALLOWED_LOOKBACKS = [3, 6, 12];

type TrendPeriod = "MONTH" | "WEEK";

export interface ExpenseTrendInput {
  userId: string;
  period: TrendPeriod;
  lookback: number;
  currency: string;
  today: string;
  categoryIds?: string[];
  includeUncategorized?: boolean;
}

export interface ExpenseTrendPoint {
  periodStart: DateString;
  amount: number;
  isCurrent: boolean;
}

export interface ExpenseTrend {
  points: ExpenseTrendPoint[];
  pastMedian: number;
  pastMedianAtSamePoint: number;
  elapsedDays: number;
}

/**
 * Parse a YYYY-MM-DD string as midnight UTC.
 * The whole grid is built in UTC so period boundaries never shift with the
 * server's own timezone; the client decides which day is "today".
 */
function parseUtcDate(value: DateString): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatUtcDate(date: Date): DateString {
  return toDateString(date.toISOString().split("T")[0]);
}

/**
 * Computes net expenses per period for a slice of the user's spending,
 * plus two medians over the completed periods used as reference lines.
 */
export class ExpenseTrendService {
  constructor(
    private transactionRepository: TransactionRepository,
    private categoryRepository: CategoryRepository,
  ) {}

  async call({
    userId,
    period,
    lookback,
    currency,
    today,
    categoryIds,
    includeUncategorized,
  }: ExpenseTrendInput): Promise<Result<ExpenseTrend, string>> {
    if (!ALLOWED_LOOKBACKS.includes(lookback)) {
      return Failure("Lookback must be 3, 6 or 12");
    }
    if (!isDateString(today)) {
      return Failure(`Invalid date format: "${today}". Expected YYYY-MM-DD.`);
    }
    if (currency.trim().length === 0) {
      return Failure("Currency must not be empty");
    }

    const periodStarts = this.buildPeriodStarts({ period, today, lookback });
    const currentPeriodStart = periodStarts[lookback];

    const transactions = await this.transactionRepository.findManyByUserId(
      userId,
      {
        categoryIds,
        currencies: [currency],
        dateAfter: periodStarts[0],
        dateBefore: today,
        includeUncategorized,
        types: [TransactionType.EXPENSE, TransactionType.REFUND],
      },
    );

    const reportedTransactions = await this.excludeReportedOutTransactions(
      userId,
      transactions,
    );
    const buckets = this.bucketByPeriod({
      transactions: reportedTransactions,
      periodStarts,
      today,
    });

    const points = periodStarts.map((periodStart, index) => ({
      periodStart,
      amount: this.sumNetAmount(buckets[index]),
      isCurrent: index === lookback,
    }));

    const elapsedDays =
      daysBetween(parseUtcDate(currentPeriodStart), parseUtcDate(today)) + 1;

    const pastAmountsAtSamePoint = periodStarts
      .slice(0, lookback)
      .map((periodStart, index) => {
        const cutoff = this.addDays(periodStart, elapsedDays - 1);
        return this.sumNetAmount(
          buckets[index].filter((transaction) => transaction.date <= cutoff),
        );
      });

    return Success({
      points,
      pastMedian: this.median(
        points.slice(0, lookback).map((point) => point.amount),
      ),
      pastMedianAtSamePoint: this.median(pastAmountsAtSamePoint),
      elapsedDays,
    });
  }

  /**
   * Build the period grid oldest first: `lookback` completed periods
   * followed by the running one.
   */
  private buildPeriodStarts({
    period,
    today,
    lookback,
  }: {
    period: TrendPeriod;
    today: DateString;
    lookback: number;
  }): DateString[] {
    const currentPeriodStart = parseUtcDate(today);
    if (period === "MONTH") {
      currentPeriodStart.setUTCDate(1);
    } else {
      // getUTCDay() returns 0 for Sunday; shift so Monday becomes 0
      const weekdayIndex = (currentPeriodStart.getUTCDay() + 6) % 7;
      currentPeriodStart.setUTCDate(
        currentPeriodStart.getUTCDate() - weekdayIndex,
      );
    }

    const periodStarts: DateString[] = [];
    for (let offset = lookback; offset >= 0; offset -= 1) {
      const periodStart = new Date(currentPeriodStart);
      if (period === "MONTH") {
        periodStart.setUTCMonth(periodStart.getUTCMonth() - offset);
      } else {
        periodStart.setUTCDate(periodStart.getUTCDate() - offset * 7);
      }
      periodStarts.push(formatUtcDate(periodStart));
    }
    return periodStarts;
  }

  /**
   * Defensive: the picker never offers excluded categories, but the service
   * must hold the rule regardless of caller.
   */
  private async excludeReportedOutTransactions(
    userId: string,
    transactions: Transaction[],
  ): Promise<Transaction[]> {
    const categories = await this.categoryRepository.findManyByUserId(userId);
    const excludedCategoryIds = new Set(
      categories
        .filter((category) => category.excludeFromReports)
        .map((category) => category.id),
    );

    return transactions.filter(
      (transaction) =>
        !transaction.categoryId ||
        !excludedCategoryIds.has(transaction.categoryId),
    );
  }

  private bucketByPeriod({
    transactions,
    periodStarts,
    today,
  }: {
    transactions: Transaction[];
    periodStarts: DateString[];
    today: DateString;
  }): Transaction[][] {
    const buckets: Transaction[][] = periodStarts.map(() => []);

    for (const transaction of transactions) {
      if (transaction.date < periodStarts[0] || transaction.date > today) {
        continue;
      }

      let index = periodStarts.length - 1;
      while (transaction.date < periodStarts[index]) {
        index -= 1;
      }
      buckets[index].push(transaction);
    }

    return buckets;
  }

  /**
   * Expenses count positive and refunds negative, matching the Expense Report.
   */
  private sumNetAmount(transactions: Transaction[]): number {
    return transactions.reduce(
      (total, transaction) => total - transaction.signedAmount,
      0,
    );
  }

  private addDays(date: DateString, days: number): DateString {
    const shifted = parseUtcDate(date);
    shifted.setUTCDate(shifted.getUTCDate() + days);
    return formatUtcDate(shifted);
  }

  private median(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }

    const sorted = [...values].sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle];
  }
}
