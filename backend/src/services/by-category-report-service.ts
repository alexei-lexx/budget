import { ReportType } from "../models/report";
import { Transaction, TransactionType } from "../models/transaction";
import { toDateString } from "../types/date";
import { formatDateAsYYYYMMDD } from "../utils/date";
import { BusinessError } from "./business-error";
import { CategoryRepository } from "./ports/category-repository";
import { TransactionRepository } from "./ports/transaction-repository";

const UNCATEGORIZED_LABEL = "Uncategorized";
const TOP_TRANSACTIONS_LIMIT = 5;

export interface ByCategoryReportCurrencyBreakdown {
  currency: string;
  totalAmount: number;
  percentage: number;
}

export interface ByCategoryReportCategory {
  categoryId?: string;
  categoryName: string;
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
   * @returns Monthly report with categories and currency totals
   */
  async call(
    userId: string,
    year: number,
    month: number | undefined,
    type: ReportType,
  ): Promise<ByCategoryReport> {
    this.validateYear(year);
    if (month !== undefined) {
      this.validateMonth(month);
    }

    // For EXPENSE reports, fetch both EXPENSE and REFUND transactions
    // For INCOME reports, fetch only INCOME transactions
    let transactionTypesToFetch: TransactionType[];

    // Function to get signed amount based on report type
    // For EXPENSE: expenses are positive, refunds are negative
    // For INCOME: amounts are as-is
    let amountGetter: (transaction: Transaction) => number;

    // Negate to get expenses as positive, refunds as negative
    const negatedSignedAmount = (transaction: Transaction) =>
      -transaction.signedAmount;

    if (type === ReportType.EXPENSE) {
      transactionTypesToFetch = [
        TransactionType.EXPENSE,
        TransactionType.REFUND,
      ];

      amountGetter = negatedSignedAmount;
    } else if (type === ReportType.INCOME) {
      transactionTypesToFetch = [TransactionType.INCOME];
      amountGetter = (transaction) => transaction.signedAmount;
    } else {
      throw new Error("Invalid report type");
    }

    const dateAfter =
      month !== undefined
        ? toDateString(formatDateAsYYYYMMDD(new Date(year, month - 1, 1)))
        : toDateString(formatDateAsYYYYMMDD(new Date(year, 0, 1)));
    const dateBefore =
      month !== undefined
        ? toDateString(formatDateAsYYYYMMDD(new Date(year, month, 0)))
        : toDateString(formatDateAsYYYYMMDD(new Date(year, 11, 31)));

    const transactions = await this.transactionRepository.findManyByUserId(
      userId,
      {
        dateAfter,
        dateBefore,
        types: transactionTypesToFetch,
      },
    );

    if (transactions.length === 0) {
      return {
        year,
        month,
        type,
        categories: [],
        currencyTotals: [],
      };
    }

    // Fetch all categories and build set of included category IDs
    const allCategories =
      await this.categoryRepository.findManyByUserId(userId);
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

    const categories = await this.groupByCategoryAndCurrency(
      includedTransactions,
      userId,
      currencyTotals,
      amountGetter,
    );

    return {
      year,
      month,
      type,
      categories,
      currencyTotals,
    };
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

  private async groupByCategoryAndCurrency(
    transactions: Transaction[],
    userId: string,
    currencyTotals: ByCategoryReportCurrencyTotal[],
    amountGetter: (t: Transaction) => number,
  ): Promise<ByCategoryReportCategory[]> {
    const categoryGroups = new Map<string | undefined, Transaction[]>();

    for (const transaction of transactions) {
      const categoryId = transaction.categoryId || undefined;
      const existing = categoryGroups.get(categoryId) || [];
      existing.push(transaction);
      categoryGroups.set(categoryId, existing);
    }

    const categories: ByCategoryReportCategory[] = [];

    for (const [categoryId, categoryTransactions] of categoryGroups) {
      let categoryName: string;
      if (categoryId === undefined) {
        categoryName = UNCATEGORIZED_LABEL;
      } else {
        const category = await this.categoryRepository.findOneById({
          id: categoryId,
          userId,
        });
        categoryName = category ? category.name : UNCATEGORIZED_LABEL;
      }

      const currencyBreakdowns = this.calculateCurrencyBreakdowns(
        categoryTransactions,
        currencyTotals,
        amountGetter,
      );

      // Get top 5 transactions by amount
      const topTransactions = categoryTransactions
        .sort((a, b) => b.amount - a.amount)
        .slice(0, TOP_TRANSACTIONS_LIMIT);

      categories.push({
        categoryId,
        categoryName,
        currencyBreakdowns,
        topTransactions,
        totalTransactionCount: categoryTransactions.length,
      });
    }

    return categories.sort((a, b) =>
      a.categoryName.localeCompare(b.categoryName),
    );
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

  private validateYear(year: number): void {
    if (!Number.isInteger(year)) {
      throw new BusinessError("Year must be a valid integer");
    }
  }

  private validateMonth(month: number): void {
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new BusinessError("Month must be a valid integer between 1 and 12");
    }
  }
}
