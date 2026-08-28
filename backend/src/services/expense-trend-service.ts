import { Temporal } from "temporal-polyfill";
import { Transaction, TransactionType } from "../models/transaction";
import { CategoryRepository } from "../ports/category-repository";
import { TransactionRepository } from "../ports/transaction-repository";
import { DateString, toDateString } from "../types/date-string";
import { Failure, Result, Success } from "../types/result";

const ALLOWED_LOOKBACKS = [3, 6, 12];

type TrendPeriod = "MONTH" | "WEEK";

export interface ExpenseTrendInput {
  userId: string;
  period: TrendPeriod;
  lookback: number;
  currency: string;
  today: DateString;
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
    if (currency.trim().length === 0) {
      return Failure("Currency must not be empty");
    }

    const periodStarts = this.buildPeriodStarts({ period, today, lookback });
    const currentPeriodStart = periodStarts[periodStarts.length - 1];

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

    const startPlainDate = Temporal.PlainDate.from(currentPeriodStart);
    const todayPlainDate = Temporal.PlainDate.from(today);
    const daysBetween = startPlainDate.until(todayPlainDate).days;
    const elapsedDays = daysBetween + 1; // +1 means today is included

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
   * Build the period grid oldest first:
   * `lookback` completed periods followed by the running one.
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
    const todayPlainDate = Temporal.PlainDate.from(today);
    const currentPeriodStartPlainDate =
      period === "MONTH"
        ? firstDayOfMonth(todayPlainDate)
        : firstDayOfWeek(todayPlainDate);

    const periodStarts: DateString[] = [];
    for (let nPeriodsAgo = lookback; nPeriodsAgo >= 0; nPeriodsAgo -= 1) {
      const periodStartPlainDate =
        period === "MONTH"
          ? currentPeriodStartPlainDate.subtract({ months: nPeriodsAgo })
          : currentPeriodStartPlainDate.subtract({ weeks: nPeriodsAgo });

      periodStarts.push(toDateString(periodStartPlainDate.toString()));
    }

    return periodStarts;
  }

  private async excludeReportedOutTransactions(
    userId: string,
    transactions: Transaction[],
  ): Promise<Transaction[]> {
    // TODO: findManyWithArchivedByUserId?
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
   * Expense's signedAmount is negative
   * Refund's signedAmount is positive
   */
  private sumNetAmount(transactions: Transaction[]): number {
    return transactions.reduce(
      (total, transaction) => total - transaction.signedAmount,
      0,
    );
  }

  private addDays(date: DateString, days: number): DateString {
    return toDateString(Temporal.PlainDate.from(date).add({ days }).toString());
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

function firstDayOfMonth(plainDate: Temporal.PlainDate): Temporal.PlainDate {
  return plainDate.with({ day: 1 });
}

function firstDayOfWeek(plainDate: Temporal.PlainDate): Temporal.PlainDate {
  return plainDate.subtract({ days: plainDate.dayOfWeek - 1 });
}
