import { Temporal } from "temporal-polyfill";
import { Transaction, TransactionType } from "../models/transaction";
import { CategoryRepository } from "../ports/category-repository";
import { TransactionRepository } from "../ports/transaction-repository";
import { DateString, toDateString } from "../types/date-string";
import { Failure, Result, Success } from "../types/result";
import { median } from "../utils/median";

type TrendPeriodUnit = "MONTH" | "WEEK";

export interface ExpenseTrendInput {
  userId: string;
  periodUnit: TrendPeriodUnit;
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
    periodUnit,
    lookback,
    currency,
    today,
    categoryIds,
    includeUncategorized,
  }: ExpenseTrendInput): Promise<Result<ExpenseTrend>> {
    if (!Number.isInteger(lookback) || lookback < 1 || lookback > 12) {
      return Failure("Lookback must be a whole number from 1 to 12");
    }
    if (currency.trim().length === 0) {
      return Failure("Currency must not be empty");
    }

    const periodStarts = this.buildPeriodStarts({
      periodUnit,
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

    const includedTransactions =
      transactions.length > 0
        ? await this.excludeReportedOutTransactions(userId, transactions)
        : [];

    const buckets = this.bucketByPeriod({
      transactions: includedTransactions,
      periodUnit,
      periodStarts,
      today,
    });

    const points = periodStarts.map((periodStart, index) => ({
      periodStart,
      amount: this.sumAmount(buckets.get(periodStart) ?? []),
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

        return this.sumAmount(
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
    periodUnit,
    today,
    lookback,
  }: {
    periodUnit: TrendPeriodUnit;
    today: DateString;
    lookback: number;
  }): DateString[] {
    const todayPlainDate = Temporal.PlainDate.from(today);
    const currentPeriodStart = this.beginningOfPeriod(
      periodUnit,
      todayPlainDate,
    );

    const periodStarts: DateString[] = [];
    for (let nPeriodsAgo = lookback; nPeriodsAgo >= 0; nPeriodsAgo -= 1) {
      const periodStart = this.subtractPeriods(
        periodUnit,
        currentPeriodStart,
        nPeriodsAgo,
      );

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
    periodUnit,
    periodStarts: periodStartDateStrings,
    today,
  }: {
    transactions: Transaction[];
    periodUnit: TrendPeriodUnit;
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

      const key = toDateString(
        this.beginningOfPeriod(
          periodUnit,
          Temporal.PlainDate.from(transaction.date),
        ).toString(),
      );
      buckets.get(key)?.push(transaction);
    }

    return buckets;
  }

  /**
   * Expense's signedAmount is negative
   * Refund's signedAmount is positive
   */
  private sumAmount(transactions: Transaction[]): number {
    return transactions.reduce(
      (total, transaction) => total - transaction.signedAmount,
      0,
    );
  }

  private beginningOfPeriod(
    periodUnit: TrendPeriodUnit,
    plainDate: Temporal.PlainDate,
  ): Temporal.PlainDate {
    switch (periodUnit) {
      case "MONTH":
        return plainDate.with({ day: 1 });
      case "WEEK":
        return plainDate.subtract({ days: plainDate.dayOfWeek - 1 });
    }
  }

  private subtractPeriods(
    periodUnit: TrendPeriodUnit,
    plainDate: Temporal.PlainDate,
    nPeriods: number,
  ): Temporal.PlainDate {
    switch (periodUnit) {
      case "MONTH":
        return plainDate.subtract({ months: nPeriods });
      case "WEEK":
        return plainDate.subtract({ weeks: nPeriods });
    }
  }
}
