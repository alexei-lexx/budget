import { ReportType } from "../models/report";
import {
  ITransactionRepository,
  Transaction,
  TransactionType,
} from "../models/transaction";
import { YEAR_RANGE_OFFSET } from "../types/validation";
import { BusinessError, BusinessErrorCodes } from "./business-error";

const DEFAULT_LIMIT = 5;

export interface CategoryTopTransactionsResult {
  transactions: Transaction[];
  totalCount: number;
}

export class CategoryTopTransactionsService {
  constructor(private transactionRepository: ITransactionRepository) {}

  /**
   * Get top transactions by amount for a specific category in a given month.
   *
   * @param userId - The user ID to fetch transactions for
   * @param year - The year (e.g., 2025)
   * @param month - The month (1-12)
   * @param categoryId - The category ID (undefined for uncategorized)
   * @param type - The report type (EXPENSE or INCOME)
   * @param limit - Maximum number of transactions to return (default: 5)
   * @returns Category top transactions result with transactions and total count
   */
  async call(
    userId: string,
    year: number,
    month: number,
    categoryId: string | undefined,
    type: ReportType,
    limit?: number,
  ): Promise<CategoryTopTransactionsResult> {
    this.validateYear(year);
    this.validateMonth(month);

    const effectiveLimit = limit !== undefined ? limit : DEFAULT_LIMIT;
    this.validateLimit(effectiveLimit);

    // Map report type to transaction types
    let transactionTypesToFetch: TransactionType[];

    if (type === ReportType.EXPENSE) {
      transactionTypesToFetch = [
        TransactionType.EXPENSE,
        TransactionType.REFUND,
      ];
    } else if (type === ReportType.INCOME) {
      transactionTypesToFetch = [TransactionType.INCOME];
    } else {
      throw new Error("Invalid report type");
    }

    // Get all transactions for the category and month
    const allTransactions =
      await this.transactionRepository.findTopByCategoryAndMonth(
        userId,
        year,
        month,
        categoryId,
        transactionTypesToFetch,
        effectiveLimit,
      );

    return {
      transactions: allTransactions,
      totalCount: allTransactions.length,
    };
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

  private validateLimit(limit: number): void {
    if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
      throw new BusinessError(
        "Limit must be a positive integer between 1 and 100",
        BusinessErrorCodes.INVALID_PARAMETERS,
      );
    }
  }
}
