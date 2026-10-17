import { Temporal } from "temporal-polyfill";
import { Failure, Result, Success } from "ts-result";
import { Category } from "../models/category";
import { Transaction, TransactionType } from "../models/transaction";
import { CategoryRepository } from "../ports/category-repository";
import { TransactionRepository } from "../ports/transaction-repository";
import { toDateString } from "../types/date-string";

const TOP_TRANSACTIONS_LIMIT = 5;

type ReportType = "INCOME" | "EXPENSE";

export interface ByCategoryReportCurrencyBreakdown {
  currency: string;
  totalAmount: number;
  percentage: number;
}

export interface ByCategoryReportCategory {
  category?: Category;
  currencyBreakdowns: ByCategoryReportCurrencyBreakdown[];
  topTransactions: Transaction[];
  totalTransactionCount: number;
}

export interface ByCategoryReportCurrencyTotal {
  currency: string;
  totalAmount: number;
}

export interface ByCategoryReport {
  year: number;
  month?: number;
  type: ReportType;
  categories: ByCategoryReportCategory[];
  currencyTotals: ByCategoryReportCurrencyTotal[];
}

export class ByCategoryReportService {
  constructor(
    private transactionRepository: TransactionRepository,
    private categoryRepository: CategoryRepository,
  ) {}

  /**
   * Generate a monthly report aggregated by category for a given month and transaction type.
   *
   * For EXPENSE reports, this method factors in REFUND transactions to calculate net spending:
   * - Fetches both EXPENSE and REFUND transactions
   * - Calculates net amounts: sum(EXPENSE) - sum(REFUND) per category + currency
   * - Supports negative amounts when refunds exceed expenses
   *
   * For INCOME reports, behavior is unchanged:
   * - Fetches only INCOME transactions
   * - Sums amounts as-is (no refund factoring)
   *
   * @param userId - The user ID to generate the report for
   * @param year - The year (e.g., 2025)
   * @param month - The month (1-12)
   * @param type - The report type (EXPENSE or INCOME)
   * @returns Monthly report with categories and currency totals, or a failure reason
   */
  async call(
    userId: string,
    year: number,
    month: number | undefined,
    type: ReportType,
  ): Promise<Result<ByCategoryReport>> {
    if (!this.isValidYear(year)) {
      return Failure("Year must be a valid integer");
    }

    if (month !== undefined && !this.isValidMonth(month)) {
      return Failure("Month must be a valid integer between 1 and 12");
    }

    // For EXPENSE reports, fetch both EXPENSE and REFUND transactions
    // For INCOME reports, fetch only INCOME transactions
    let transactionTypesToFetch: TransactionType[];

    // Function to get signed amount based on report type
    // For EXPENSE: expenses are positive, refunds are negative
    // For INCOME: amounts are as-is
    let amountGetter: (transaction: Transaction) => number;

    if (type === "EXPENSE") {
      transactionTypesToFetch = ["EXPENSE", "REFUND"];
      // Negate to get expenses as positive, refunds as negative
      amountGetter = (transaction) => -transaction.signedAmount;
    } else if (type === "INCOME") {
      transactionTypesToFetch = ["INCOME"];
      amountGetter = (transaction) => transaction.signedAmount;
    } else {
      return Failure("Invalid report type");
    }

    const dateAfter =
      month !== undefined ? firstDayOfMonth(year, month) : firstDayOfYear(year);
    const dateBefore =
      month !== undefined ? lastDayOfMonth(year, month) : lastDayOfYear(year);

    const transactions = await this.transactionRepository.findManyByUserId(
      userId,
      {
        dateAfter,
        dateBefore,
        types: transactionTypesToFetch,
      },
    );

    if (transactions.length === 0) {
      return Success({
        year,
        month,
        type,
        categories: [],
        currencyTotals: [],
      });
    }

    // Fetch all categories and build set of included category IDs
    const allCategories =
      await this.categoryRepository.findManyWithArchivedByUserId(userId);
    const excludedCategoryIds = new Set(
      allCategories
        .filter((category) => category.excludeFromReports)
        .map((category) => category.id),
    );

    // Filter transactions to exclude those linked to excluded categories
    const includedTransactions = transactions.filter(
      (transaction) =>
        !transaction.categoryId ||
        !excludedCategoryIds.has(transaction.categoryId),
    );

    const currencyTotals = this.calculateCurrencyTotals(
      includedTransactions,
      amountGetter,
    );

    const categoryRows = this.groupByCategoryAndCurrency({
      transactions: includedTransactions,
      categories: allCategories,
      currencyTotals,
      amountGetter,
    });

    return Success({
      year,
      month,
      type,
      categories: categoryRows,
      currencyTotals,
    });
  }

  private calculateCurrencyTotals(
    transactions: Transaction[],
    amountGetter: (t: Transaction) => number,
  ): ByCategoryReportCurrencyTotal[] {
    const totals = new Map<string, number>();

    for (const transaction of transactions) {
      const current = totals.get(transaction.currency) || 0;
      const amount = amountGetter(transaction);
      totals.set(transaction.currency, current + amount);
    }

    return Array.from(totals.entries())
      .map(([currency, totalAmount]) => ({ currency, totalAmount }))
      .sort((a, b) => a.currency.localeCompare(b.currency));
  }

  private groupByCategoryAndCurrency({
    transactions,
    categories,
    currencyTotals,
    amountGetter,
  }: {
    transactions: Transaction[];
    categories: Category[];
    currencyTotals: ByCategoryReportCurrencyTotal[];
    amountGetter: (t: Transaction) => number;
  }): ByCategoryReportCategory[] {
    const categoryById = new Map(
      categories.map((category) => [category.id, category]),
    );

    const categoryGroups = new Map<
      string | undefined,
      { category?: Category; transactions: Transaction[] }
    >();

    for (const transaction of transactions) {
      // A category ID with no record joins the group without a category
      const category = transaction.categoryId
        ? categoryById.get(transaction.categoryId)
        : undefined;
      const categoryId = category?.id;
      const existing = categoryGroups.get(categoryId) || {
        category,
        transactions: [],
      };
      existing.transactions.push(transaction);
      categoryGroups.set(categoryId, existing);
    }

    const categoryRows: ByCategoryReportCategory[] = [];

    for (const {
      category,
      transactions: categoryTransactions,
    } of categoryGroups.values()) {
      const currencyBreakdowns = this.calculateCurrencyBreakdowns(
        categoryTransactions,
        currencyTotals,
        amountGetter,
      );

      // Get top 5 transactions by amount
      const topTransactions = categoryTransactions
        .sort((a, b) => b.amount - a.amount)
        .slice(0, TOP_TRANSACTIONS_LIMIT);

      categoryRows.push({
        category,
        currencyBreakdowns,
        topTransactions,
        totalTransactionCount: categoryTransactions.length,
      });
    }

    // Groups with a category sort by name, the group without a category is last
    return categoryRows.sort((a, b) => {
      if (!a.category) return b.category ? 1 : 0;
      if (!b.category) return -1;
      return a.category.name.localeCompare(b.category.name);
    });
  }

  private calculateCurrencyBreakdowns(
    transactions: Transaction[],
    currencyTotals: ByCategoryReportCurrencyTotal[],
    amountGetter: (t: Transaction) => number,
  ): ByCategoryReportCurrencyBreakdown[] {
    const categoryTotals = new Map<string, number>();

    for (const transaction of transactions) {
      const current = categoryTotals.get(transaction.currency) || 0;
      const amount = amountGetter(transaction);
      categoryTotals.set(transaction.currency, current + amount);
    }

    const breakdowns: ByCategoryReportCurrencyBreakdown[] = [];

    for (const [currency, totalAmount] of categoryTotals) {
      const currencyTotal = currencyTotals.find(
        (ct) => ct.currency === currency,
      );
      const percentage =
        currencyTotal && currencyTotal.totalAmount !== 0
          ? Math.round((totalAmount / currencyTotal.totalAmount) * 100)
          : 0;

      breakdowns.push({
        currency,
        totalAmount,
        percentage,
      });
    }

    return breakdowns.sort((a, b) => a.currency.localeCompare(b.currency));
  }

  private isValidYear(year: number): boolean {
    return Number.isInteger(year) && year >= 1000 && year <= 9999;
  }

  private isValidMonth(month: number): boolean {
    return Number.isInteger(month) && month >= 1 && month <= 12;
  }
}

function firstDayOfMonth(year: number, month: number) {
  const yearMonth = Temporal.PlainYearMonth.from({ year, month });
  return toDateString(yearMonth.toPlainDate({ day: 1 }).toString());
}

function firstDayOfYear(year: number) {
  return firstDayOfMonth(year, 1);
}

function lastDayOfMonth(year: number, month: number) {
  const yearMonth = Temporal.PlainYearMonth.from({ year, month });
  return toDateString(
    yearMonth.toPlainDate({ day: yearMonth.daysInMonth }).toString(),
  );
}

function lastDayOfYear(year: number) {
  return lastDayOfMonth(year, 12);
}
