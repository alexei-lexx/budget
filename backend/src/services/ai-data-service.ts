import { Account, IAccountRepository } from "../models/account";
import { Category, ICategoryRepository } from "../models/category";
import { ITransactionRepository, Transaction } from "../models/transaction";
import { BusinessError, BusinessErrorCodes } from "./business-error";

export interface DateRange {
  startDate: string;
  endDate: string;
}

export class AiDataService {
  constructor(
    private accountRepository: IAccountRepository,
    private categoryRepository: ICategoryRepository,
    private transactionRepository: ITransactionRepository,
  ) {}

  async getAvailableAccounts(userId: string): Promise<Account[]> {
    if (!userId) {
      throw new BusinessError(
        "User ID is required",
        BusinessErrorCodes.INVALID_PARAMETERS,
      );
    }

    return this.accountRepository.findActiveByUserId(userId);
  }

  async getAvailableCategories(userId: string): Promise<Category[]> {
    if (!userId) {
      throw new BusinessError(
        "User ID is required",
        BusinessErrorCodes.INVALID_PARAMETERS,
      );
    }

    return this.categoryRepository.findActiveByUserId(userId);
  }

  async getFilteredTransactions(
    userId: string,
    dateRange: DateRange,
    categoryIds?: string[],
    accountIds?: string[],
  ): Promise<Transaction[]> {
    if (!userId) {
      throw new BusinessError(
        "User ID is required",
        BusinessErrorCodes.INVALID_PARAMETERS,
      );
    }

    if (!dateRange.startDate || !dateRange.endDate) {
      throw new BusinessError(
        "Start date and end date are required",
        BusinessErrorCodes.INVALID_PARAMETERS,
      );
    }

    // Get all transactions in the date range
    const transactions = await this.transactionRepository.findActiveByDateRange(
      userId,
      dateRange.startDate,
      dateRange.endDate,
    );

    // Apply filters if provided
    let filteredTransactions = transactions;

    if (accountIds && accountIds.length > 0) {
      const accountIdSet = new Set(accountIds);
      filteredTransactions = filteredTransactions.filter((transaction) =>
        accountIdSet.has(transaction.accountId),
      );
    }

    if (categoryIds && categoryIds.length > 0) {
      const categoryIdSet = new Set(categoryIds);
      filteredTransactions = filteredTransactions.filter(
        (transaction) =>
          transaction.categoryId && categoryIdSet.has(transaction.categoryId),
      );
    }

    return filteredTransactions;
  }
}
