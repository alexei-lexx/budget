import { ICategoryRepository } from "../models/Category";
import {
  ITransactionRepository,
  Transaction,
  TransactionType,
} from "../models/Transaction";
import { CurrencyTotal, calculateCurrencyTotals } from "./reportCalculations";

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

// Re-export for backward compatibility
export type MonthlyReportCurrencyTotal = CurrencyTotal;

export interface MonthlyReport {
  year: number;
  month: number;
  type: TransactionType;
  categories: MonthlyReportCategory[];
  currencyTotals: MonthlyReportCurrencyTotal[];
}

export class MonthlyByCategoryReportService {
  constructor(
    private transactionRepository: ITransactionRepository,
    private categoryRepository: ICategoryRepository,
  ) {}

  async getMonthlyReport(
    userId: string,
    year: number,
    month: number,
    type: TransactionType,
  ): Promise<MonthlyReport> {
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
        categories: [],
        currencyTotals: [],
      };
    }

    const currencyTotals = calculateCurrencyTotals(transactions);
    const categories = await this.groupByCategoryAndCurrency(
      transactions,
      userId,
      currencyTotals,
    );

    return {
      year,
      month,
      type,
      categories,
      currencyTotals,
    };
  }

  private async groupByCategoryAndCurrency(
    transactions: Transaction[],
    userId: string,
    currencyTotals: MonthlyReportCurrencyTotal[],
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
  ): MonthlyReportCurrencyBreakdown[] {
    const categoryTotals = new Map<string, number>();

    for (const transaction of transactions) {
      const current = categoryTotals.get(transaction.currency) || 0;
      categoryTotals.set(transaction.currency, current + transaction.amount);
    }

    const breakdowns: MonthlyReportCurrencyBreakdown[] = [];

    for (const [currency, totalAmount] of categoryTotals) {
      const currencyTotal = currencyTotals.find(
        (ct) => ct.currency === currency,
      );
      const percentage =
        currencyTotal && currencyTotal.totalAmount > 0
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
}
