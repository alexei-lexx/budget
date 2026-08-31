import { Temporal } from "temporal-polyfill";
import { MAX_PERIOD_DAYS } from "../langchain/tools/get-transactions";
import { Transaction, TransactionType } from "../models/transaction";
import { CategoryRepository } from "../ports/category-repository";
import { TransactionRepository } from "../ports/transaction-repository";
import { DateString } from "../types/date-string";
import { Failure, Result, Success } from "../types/result";

export const AGGREGATE_GROUP_BY = ["ACCOUNT", "CATEGORY", "MONTH"] as const;
export type AggregateGroupBy = (typeof AGGREGATE_GROUP_BY)[number];

export interface AggregateTransactionsInput {
  userId: string;
  startDate: DateString;
  endDate: DateString;
  accountIds?: string[];
  categoryIds?: string[];
  includeUncategorized?: true;
  types?: TransactionType[];
  includeTransactionsExcludedFromReports: boolean;
  groupBy?: AggregateGroupBy;
}

interface AggregateTransactionsItem {
  type: TransactionType;
  currency: string;
  accountId?: string;
  categoryId?: string | null;
  month?: string;
  sum: number;
  count: number;
  min: number;
  max: number;
}

export type AggregateTransactionsOutput = Result<AggregateTransactionsItem[]>;

export interface AggregateTransactionsService {
  call(input: AggregateTransactionsInput): Promise<AggregateTransactionsOutput>;
}

/**
 * Computes sum/count/min/max over transactions matching a filter,
 * split by type and currency, and optionally further grouped by
 * account, category, or month.
 */
export class AggregateTransactionsServiceImpl implements AggregateTransactionsService {
  constructor(
    private transactionRepository: TransactionRepository,
    private categoryRepository: CategoryRepository,
  ) {}

  async call({
    userId,
    startDate,
    endDate,
    accountIds,
    categoryIds,
    includeUncategorized,
    types,
    includeTransactionsExcludedFromReports,
    groupBy,
  }: AggregateTransactionsInput): Promise<AggregateTransactionsOutput> {
    if (startDate > endDate) {
      return Failure("startDate must not be after endDate");
    }

    const startPlainDate = Temporal.PlainDate.from(startDate);
    const endPlainDate = Temporal.PlainDate.from(endDate);
    const daysBetween = startPlainDate.until(endPlainDate).days;

    if (daysBetween > MAX_PERIOD_DAYS) {
      return Failure(`Date range must not exceed ${MAX_PERIOD_DAYS} days`);
    }

    const excludedCategoryIds = includeTransactionsExcludedFromReports
      ? undefined
      : await this.findExcludedCategoryIds(userId);

    if (excludedCategoryIds) {
      const collidingCategoryId = categoryIds?.find((categoryId) =>
        excludedCategoryIds.has(categoryId),
      );

      if (collidingCategoryId) {
        return Failure(
          `categoryIds must not name a category excluded from reports while includeTransactionsExcludedFromReports is false: ${collidingCategoryId}`,
        );
      }
    }

    const transactions = await this.transactionRepository.findManyByUserId(
      userId,
      {
        dateAfter: startDate,
        dateBefore: endDate,
        ...(accountIds && { accountIds }),
        ...(categoryIds && { categoryIds }),
        ...(includeUncategorized && { includeUncategorized }),
        ...(types && { types }),
      },
    );

    const includedTransactions = excludedCategoryIds
      ? transactions.filter(
          (transaction) =>
            !transaction.categoryId ||
            !excludedCategoryIds.has(transaction.categoryId),
        )
      : transactions;

    return Success(this.bucket(includedTransactions, groupBy));
  }

  private async findExcludedCategoryIds(userId: string): Promise<Set<string>> {
    const categories =
      await this.categoryRepository.findManyWithArchivedByUserId(userId);

    return new Set(
      categories
        .filter((category) => category.excludeFromReports)
        .map((category) => category.id),
    );
  }

  private bucket(
    transactions: Transaction[],
    groupBy: AggregateGroupBy | undefined,
  ): AggregateTransactionsItem[] {
    const buckets = new Map<string, AggregateTransactionsItem>();

    for (const transaction of transactions) {
      const key = JSON.stringify([
        transaction.type,
        transaction.currency,
        this.groupValue(transaction, groupBy),
      ]);

      const existing = buckets.get(key);

      if (existing) {
        existing.sum += transaction.amount;
        existing.count += 1;
        existing.min = Math.min(existing.min, transaction.amount);
        existing.max = Math.max(existing.max, transaction.amount);

        continue;
      }

      buckets.set(key, {
        type: transaction.type,
        currency: transaction.currency,
        ...(groupBy === "ACCOUNT" && { accountId: transaction.accountId }),
        ...(groupBy === "CATEGORY" && {
          categoryId: transaction.categoryId ?? null,
        }),
        ...(groupBy === "MONTH" && { month: this.yearMonth(transaction.date) }),
        sum: transaction.amount,
        count: 1,
        min: transaction.amount,
        max: transaction.amount,
      });
    }

    return Array.from(buckets.values());
  }

  private groupValue(
    transaction: Transaction,
    groupBy: AggregateGroupBy | undefined,
  ): string | null | undefined {
    switch (groupBy) {
      case "ACCOUNT":
        return transaction.accountId;
      case "CATEGORY":
        return transaction.categoryId ?? null;
      case "MONTH":
        return this.yearMonth(transaction.date);
      case undefined:
        return undefined;
    }
  }

  private yearMonth(date: DateString): string {
    return Temporal.PlainDate.from(date).toPlainYearMonth().toString();
  }
}
