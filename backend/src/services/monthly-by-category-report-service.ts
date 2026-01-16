import { ICategoryRepository } from "../models/category";
import { ReportType } from "../models/report";
import {
  ITransactionRepository,
  Transaction,
  TransactionType,
  getSignedAmount,
} from "../models/transaction";
import { YEAR_RANGE_OFFSET } from "../types/validation";
import { BusinessError, BusinessErrorCodes } from "./business-error";

const UNCATEGORIZED_LABEL = "Uncategorized";

export interface MonthlyReportCurrencyBreakdown {
  currency: string;
  totalAmount: number;
  percentage: number;
}

export interface MonthlyReportCategory {
  categoryId?: string;
  categoryName: string;
  currencyBreakdowns: MonthlyReportCurrencyBreakdown[];
}

export interface MonthlyReportCurrencyTotal {
  currency: string;
  totalAmount: number;
}

export interface MonthlyReport {
  year: number;
  month: number;
  type: ReportType;
  categories: MonthlyReportCategory[];
  currencyTotals: MonthlyReportCurrencyTotal[];
}

export class MonthlyByCategoryReportService {
  constructor(
    private transactionRepository: ITransactionRepository,
    private categoryRepository: ICategoryRepository,
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
    month: number,
    type: ReportType,
  ): Promise<MonthlyReport> {
    this.validateYear(year);
    this.validateMonth(month);

    // For EXPENSE reports, fetch both EXPENSE and REFUND transactions
    // For INCOME reports, fetch only INCOME transactions
    let transactionTypesToFetch: TransactionType[];

    // Function to get signed amount based on report type
    // For EXPENSE: expenses are positive, refunds are negative
    // For INCOME: amounts are as-is
    let amountGetter: typeof getSignedAmount;

    // Negate to get expenses as positive, refunds as negative
    const negatedSignedAmount = (transaction: Transaction) =>
      -getSignedAmount(transaction);

    if (type === ReportType.EXPENSE) {
      transactionTypesToFetch = [
        TransactionType.EXPENSE,
        TransactionType.REFUND,
      ];

      amountGetter = negatedSignedAmount;
    } else if (type === ReportType.INCOME) {
      transactionTypesToFetch = [TransactionType.INCOME];
      amountGetter = getSignedAmount;
    } else {
      throw new Error("Invalid report type");
    }

    const transactions =
      await this.transactionRepository.findActiveByMonthAndTypes(
        userId,
        year,
        month,
        transactionTypesToFetch,
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

    const currencyTotals = this.calculateCurrencyTotals(
      transactions,
      amountGetter,
    );

    const categories = await this.groupByCategoryAndCurrency(
      transactions,
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
  ): MonthlyReportCurrencyTotal[] {
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
    currencyTotals: MonthlyReportCurrencyTotal[],
    amountGetter: (t: Transaction) => number,
  ): Promise<MonthlyReportCategory[]> {
    const categoryGroups = new Map<string | undefined, Transaction[]>();

    for (const transaction of transactions) {
      const categoryId = transaction.categoryId || undefined;
      const existing = categoryGroups.get(categoryId) || [];
      existing.push(transaction);
      categoryGroups.set(categoryId, existing);
    }

    const categories: MonthlyReportCategory[] = [];

    for (const [categoryId, categoryTransactions] of categoryGroups) {
      let categoryName: string;
      if (categoryId === undefined) {
        categoryName = UNCATEGORIZED_LABEL;
      } else {
        const category = await this.categoryRepository.findActiveById(
          categoryId,
          userId,
        );
        categoryName = category ? category.name : UNCATEGORIZED_LABEL;
      }

      const currencyBreakdowns = this.calculateCurrencyBreakdowns(
        categoryTransactions,
        currencyTotals,
        amountGetter,
      );

      categories.push({
        categoryId,
        categoryName,
        currencyBreakdowns,
      });
    }

    return categories.sort((a, b) =>
      a.categoryName.localeCompare(b.categoryName),
    );
  }

  private calculateCurrencyBreakdowns(
    transactions: Transaction[],
    currencyTotals: MonthlyReportCurrencyTotal[],
    amountGetter: (t: Transaction) => number,
  ): MonthlyReportCurrencyBreakdown[] {
    const categoryTotals = new Map<string, number>();

    for (const transaction of transactions) {
      const current = categoryTotals.get(transaction.currency) || 0;
      const amount = amountGetter(transaction);
      categoryTotals.set(transaction.currency, current + amount);
    }

    const breakdowns: MonthlyReportCurrencyBreakdown[] = [];

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
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - YEAR_RANGE_OFFSET;
    const maxYear = currentYear + YEAR_RANGE_OFFSET;

    if (!Number.isInteger(year) || year < minYear || year > maxYear) {
      throw new BusinessError(
        `Year must be a valid integer between ${minYear} and ${maxYear}`,
        BusinessErrorCodes.INVALID_PARAMETERS,
      );
    }
  }

  private validateMonth(month: number): void {
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new BusinessError(
        "Month must be a valid integer between 1 and 12",
        BusinessErrorCodes.INVALID_PARAMETERS,
      );
    }
  }
}
