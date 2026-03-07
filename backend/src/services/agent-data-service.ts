import { IAccountRepository } from "../models/account";
import { CategoryType, ICategoryRepository } from "../models/category";
import {
  ITransactionRepository,
  TransactionFilterInput,
  TransactionType,
} from "../models/transaction";
import { DateString } from "../types/date";
import { MAX_PAGE_SIZE } from "../types/pagination";

export interface AccountData {
  id: string;
  name: string;
  currency: string;
  isArchived: boolean;
}

export interface CategoryData {
  id: string;
  name: string;
  type: CategoryType;
  isArchived: boolean;
}

export interface TransactionData {
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

export enum EntityScope {
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
  ALL = "ALL",
}

export interface IAgentDataService {
  getAccounts(userId: string, scope: EntityScope): Promise<AccountData[]>;
  getCategories(userId: string, scope: EntityScope): Promise<CategoryData[]>;
  getFilteredTransactions(
    userId: string,
    startDate: DateString,
    endDate: DateString,
    categoryId?: string,
    accountId?: string,
  ): Promise<TransactionData[]>;
}

export class AgentDataService implements IAgentDataService {
  constructor(
    private accountRepository: IAccountRepository,
    private categoryRepository: ICategoryRepository,
    private transactionRepository: ITransactionRepository,
  ) {}

  async getAccounts(
    userId: string,
    scope: EntityScope,
  ): Promise<AccountData[]> {
    const accounts = await this.accountRepository.findAllByUserId(userId);

    const filteredAccounts = accounts.filter((account) => {
      if (scope === EntityScope.ALL) return true;
      if (scope === EntityScope.ACTIVE) return !account.isArchived;
      return account.isArchived;
    });

    return filteredAccounts.map((account) => ({
      id: account.id,
      name: account.name,
      currency: account.currency,
      isArchived: account.isArchived,
    }));
  }

  async getCategories(
    userId: string,
    scope: EntityScope,
  ): Promise<CategoryData[]> {
    const categories = await this.categoryRepository.findAllByUserId(userId);

    const filteredCategories = categories.filter((category) => {
      if (scope === EntityScope.ALL) return true;
      if (scope === EntityScope.ACTIVE) return !category.isArchived;
      return category.isArchived;
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
    const filters: TransactionFilterInput = {
      dateAfter: startDate,
      dateBefore: endDate,
      ...(accountId && { accountIds: [accountId] }),
      ...(categoryId && { categoryIds: [categoryId] }),
    };

    const result: TransactionData[] = [];
    let cursor: string | undefined;
    do {
      const connection = await this.transactionRepository.findActiveByUserId(
        userId,
        { first: MAX_PAGE_SIZE, after: cursor },
        filters,
      );
      result.push(
        ...connection.edges.map((edge) => ({
          id: edge.node.id,
          accountId: edge.node.accountId,
          categoryId: edge.node.categoryId,
          type: edge.node.type,
          amount: edge.node.amount,
          currency: edge.node.currency,
          date: edge.node.date,
          description: edge.node.description,
          transferId: edge.node.transferId,
        })),
      );
      cursor = connection.pageInfo.hasNextPage
        ? connection.pageInfo.endCursor
        : undefined;
    } while (cursor);

    return result;
  }
}
