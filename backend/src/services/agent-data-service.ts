import { IAccountRepository } from "../models/account";
import { CategoryType, ICategoryRepository } from "../models/category";
import { ITransactionRepository, TransactionType } from "../models/transaction";
import { DateRange } from "../types/date-range";

interface AccountData {
  id: string;
  name: string;
  currency: string;
  isArchived: boolean;
}

interface CategoryData {
  id: string;
  name: string;
  type: CategoryType;
  isArchived: boolean;
}

interface TransactionData {
  id: string;
  accountId: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  date: string;
  description?: string;
  transferId?: string;
}

export class AgentDataService {
  constructor(
    private accountRepository: IAccountRepository,
    private categoryRepository: ICategoryRepository,
    private transactionRepository: ITransactionRepository,
  ) {}

  async getAllAccounts(userId: string): Promise<AccountData[]> {
    const accounts = await this.accountRepository.findAllByUserId(userId);

    return accounts.map((account) => ({
      id: account.id,
      name: account.name,
      currency: account.currency,
      isArchived: account.isArchived,
    }));
  }

  async getAllCategories(userId: string): Promise<CategoryData[]> {
    const categories = await this.categoryRepository.findAllByUserId(userId);

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
    categoryId?: string,
    accountId?: string,
  ): Promise<TransactionData[]> {
    const transactions = await this.transactionRepository.findActiveByDateRange(
      userId,
      dateRange.startDate,
      dateRange.endDate,
    );

    let filteredTransactions = transactions;

    if (accountId) {
      filteredTransactions = filteredTransactions.filter(
        (transaction) => transaction.accountId === accountId,
      );
    }

    if (categoryId) {
      filteredTransactions = filteredTransactions.filter(
        (transaction) => transaction.categoryId === categoryId,
      );
    }

    return filteredTransactions.map((transaction) => ({
      id: transaction.id,
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
      date: transaction.date,
      description: transaction.description,
      transferId: transaction.transferId,
    }));
  }
}
