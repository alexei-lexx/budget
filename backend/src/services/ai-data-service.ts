import { IAccountRepository } from "../models/account";
import { ICategoryRepository } from "../models/category";
import { ITransactionRepository } from "../models/transaction";
import { BusinessError, BusinessErrorCodes } from "./business-error";

export interface DateRange {
  startDate: string;
  endDate: string;
}

// JSON-ready objects for AI consumption (excludes internal fields)
export interface AiAccount {
  id: string;
  name: string;
  currency: string;
  isArchived: boolean;
}

export interface AiCategory {
  id: string;
  name: string;
  type: string;
  isArchived: boolean;
}

export interface AiTransaction {
  id: string;
  accountId: string;
  categoryId: string | null;
  type: string;
  amount: number;
  currency: string;
  date: string;
  description: string;
  transferId: string | null;
}

export class AiDataService {
  constructor(
    private accountRepository: IAccountRepository,
    private categoryRepository: ICategoryRepository,
    private transactionRepository: ITransactionRepository,
  ) {}

  async getAvailableAccounts(userId: string): Promise<AiAccount[]> {
    if (!userId) {
      throw new BusinessError(
        "User ID is required",
        BusinessErrorCodes.INVALID_PARAMETERS,
      );
    }

    const accounts = await this.accountRepository.findActiveByUserId(userId);

    return accounts.map((account) => ({
      id: account.id,
      name: account.name,
      currency: account.currency,
      isArchived: account.isArchived,
    }));
  }

  async getAvailableCategories(userId: string): Promise<AiCategory[]> {
    if (!userId) {
      throw new BusinessError(
        "User ID is required",
        BusinessErrorCodes.INVALID_PARAMETERS,
      );
    }

    const categories = await this.categoryRepository.findActiveByUserId(userId);

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      type: category.type,
      isArchived: category.isArchived,
    }));
  }

  async getFilteredTransactions(
    userId: string,
    dateRange: DateRange,
    categoryIds?: string[],
    accountIds?: string[],
  ): Promise<AiTransaction[]> {
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

    return filteredTransactions.map((transaction) => ({
      id: transaction.id,
      accountId: transaction.accountId,
      categoryId: transaction.categoryId ?? null,
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
      date: transaction.date,
      description: transaction.description ?? "",
      transferId: transaction.transferId ?? null,
    }));
  }
}
