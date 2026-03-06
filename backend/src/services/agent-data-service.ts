import { IAccountRepository } from "../models/account";
import { CategoryType, ICategoryRepository } from "../models/category";
import { ITransactionRepository, TransactionType } from "../models/transaction";
import { DateString } from "../types/date";

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

  async getAccounts(input: {
    userId: string;
    includeActive: boolean;
    includeArchived: boolean;
  }): Promise<AccountData[]> {
    const accounts = await this.accountRepository.findAllByUserId(input.userId);

    const filteredAccounts = accounts.filter((account) => {
      if (input.includeActive && !account.isArchived) {
        return true;
      }

      if (input.includeArchived && account.isArchived) {
        return true;
      }

      return false;
    });

    return filteredAccounts.map((account) => ({
      id: account.id,
      name: account.name,
      currency: account.currency,
      isArchived: account.isArchived,
    }));
  }

  async getCategories(input: {
    userId: string;
    includeActive: boolean;
    includeArchived: boolean;
  }): Promise<CategoryData[]> {
    const categories = await this.categoryRepository.findAllByUserId(
      input.userId,
    );

    const filteredCategories = categories.filter((category) => {
      if (input.includeActive && !category.isArchived) {
        return true;
      }

      if (input.includeArchived && category.isArchived) {
        return true;
      }

      return false;
    });

    return filteredCategories.map((category) => ({
      id: category.id,
      name: category.name,
      type: category.type,
      isArchived: category.isArchived,
    }));
  }

  async getFilteredTransactions(
    userId: string,
    startDate: DateString,
    endDate: DateString,
    categoryId?: string,
    accountId?: string,
  ): Promise<TransactionData[]> {
    const transactions = await this.transactionRepository.findActiveByDateRange(
      userId,
      startDate,
      endDate,
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
