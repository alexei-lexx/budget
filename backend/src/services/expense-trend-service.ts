import { Temporal } from "temporal-polyfill";
import { Transaction, TransactionType } from "../models/transaction";
import { CategoryRepository } from "../ports/category-repository";
import { TransactionRepository } from "../ports/transaction-repository";
import { DateString, toDateString } from "../types/date-string";
import { Failure, Result, Success } from "../types/result";
import { median } from "../utils/median";

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

export interface ExpenseTrend {
  points: {
    periodStart: DateString;
    amount: number;
    isCurrent: boolean;
  }[];
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
  }: ExpenseTrendInput): Promise<Result<ExpenseTrend>> {
    if (!ALLOWED_LOOKBACKS.includes(lookback)) {
      return Failure("Lookback must be 3, 6 or 12");
    }
    if (currency.trim().length === 0) {
      return Failure("Currency must not be empty");
    }

    const periodStarts = this.buildPeriodStarts({
      period,
      today,
      lookback,
    });
    const currentPeriodStart = periodStarts[periodStarts.length - 1];
    const firstPeriodStart = periodStarts[0];

    const transactions = await this.transactionRepository.findManyByUserId(
      userId,
      {
        categoryIds,
        currencies: [currency],
        dateAfter: firstPeriodStart,
        dateBefore: today,
        includeUncategorized,
        types: [TransactionType.EXPENSE, TransactionType.REFUND],
      },
    );

    const reportedTransactions =
      transactions.length > 0
        ? await this.excludeReportedOutTransactions(userId, transactions)
        : [];

    const buckets = this.bucketByPeriod({
      transactions: reportedTransactions,
      period,
      periodStarts,
      today,
    });

    const points = periodStarts.map((periodStart, index) => ({
      periodStart,
      amount: this.sumNetAmount(buckets.get(periodStart) ?? []),
      isCurrent: index === lookback,
    }));

    const startPlainDate = Temporal.PlainDate.from(currentPeriodStart);
    const todayPlainDate = Temporal.PlainDate.from(today);
    const daysBetween = startPlainDate.until(todayPlainDate).days;
    const elapsedDays = daysBetween + 1; // +1 means today is included

    const pastAmountsAtSamePoint = periodStarts
      .slice(0, lookback)
      .map((periodStart) => {
        const cutoff = toDateString(
          Temporal.PlainDate.from(periodStart)
            .add({ days: elapsedDays - 1 })
            .toString(),
        );

        return this.sumNetAmount(
          (buckets.get(periodStart) ?? []).filter(
            (transaction) => transaction.date <= cutoff,
          ),
        );
      });

    const pastAmounts = points.slice(0, lookback).map((point) => point.amount);

    return Success({
      points,
      pastMedian: median(pastAmounts),
      pastMedianAtSamePoint: median(pastAmountsAtSamePoint),
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
    const currentPeriodStart =
      period === "MONTH"
        ? firstDayOfMonth(todayPlainDate)
        : firstDayOfWeek(todayPlainDate);

    const periodStarts: DateString[] = [];
    for (let nPeriodsAgo = lookback; nPeriodsAgo >= 0; nPeriodsAgo -= 1) {
      const periodStart =
        period === "MONTH"
          ? currentPeriodStart.subtract({ months: nPeriodsAgo })
          : currentPeriodStart.subtract({ weeks: nPeriodsAgo });

      periodStarts.push(toDateString(periodStart.toString()));
    }

    return periodStarts;
  }

  private async excludeReportedOutTransactions(
    userId: string,
    transactions: Transaction[],
  ): Promise<Transaction[]> {
    const categories =
      await this.categoryRepository.findManyWithArchivedByUserId(userId);
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
    period,
    periodStarts: periodStartDateStrings,
    today,
  }: {
    transactions: Transaction[];
    period: TrendPeriod;
    periodStarts: DateString[];
    today: DateString;
  }): Map<DateString, Transaction[]> {
    const buckets = new Map<DateString, Transaction[]>(
      periodStartDateStrings.map((periodStart) => [periodStart, []]),
    );

    for (const transaction of transactions) {
      if (transaction.date > today) {
        continue;
      }
      const key = this.periodStartOf(period, transaction.date);
      buckets.get(key)?.push(transaction);
    }

    return buckets;
  }

  private periodStartOf(period: TrendPeriod, date: DateString): DateString {
    const plainDate = Temporal.PlainDate.from(date);
    const periodStartPlainDate =
      period === "MONTH"
        ? firstDayOfMonth(plainDate)
        : firstDayOfWeek(plainDate);
    return toDateString(periodStartPlainDate.toString());
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
}

function firstDayOfMonth(plainDate: Temporal.PlainDate): Temporal.PlainDate {
  return plainDate.with({ day: 1 });
}

function firstDayOfWeek(plainDate: Temporal.PlainDate): Temporal.PlainDate {
  return plainDate.subtract({ days: plainDate.dayOfWeek - 1 });
}
