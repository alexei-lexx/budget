import { CategoryType } from "../models/category";
import { TransactionType } from "../models/transaction";
import { DateString, toDateString } from "../types/date";
import { MAX_PAGE_SIZE } from "../types/pagination";
import { daysAgo, formatDateAsYYYYMMDD } from "../utils/date";
import { IAccountRepository } from "./ports/account-repository";
import { ICategoryRepository } from "./ports/category-repository";
import {
  ITransactionRepository,
  TransactionFilterInput,
} from "./ports/transaction-repository";

// Category history enrichment constants
export const CATEGORY_HISTORY_LOOKBACK_DAYS = 90;
export const CATEGORY_HISTORY_MAX_DESCRIPTIONS_PER_CATEGORY = 10;

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
  recentDescriptions: string[];
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

    if (filteredCategories.length === 0) {
      return [];
    }

    // Build enriched category data with recent transaction descriptions
    const categoryData = filteredCategories.map((category) => ({
      id: category.id,
      name: category.name,
      type: category.type,
      isArchived: category.isArchived,
      recentDescriptions: [],
    }));

    // Enrich with recent transaction descriptions
    const enrichedCategoryData = await this.enrichCategoriesWithHistory(
      userId,
      categoryData,
    );

    return enrichedCategoryData;
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

  private async enrichCategoriesWithHistory(
    userId: string,
    categories: CategoryData[],
  ): Promise<CategoryData[]> {
    // Calculate lookback date (90 days ago from today)
    const today = new Date();
    const lookbackDate = daysAgo(today, CATEGORY_HISTORY_LOOKBACK_DAYS);

    const lookbackDateString = toDateString(formatDateAsYYYYMMDD(lookbackDate));
    const todayString = toDateString(formatDateAsYYYYMMDD(today));

    // Fetch all transactions within lookback window
    const transactions = await this.getFilteredTransactions(
      userId,
      lookbackDateString,
      todayString,
    );

    // Build set of returned category IDs for quick lookup
    const categoryIdSet = new Set(categories.map((category) => category.id));

    // Group unique descriptions by categoryId (filter, deduplicate, and group in single pass)
    const descriptionsByCategory = new Map<string, Set<string>>();
    for (const transaction of transactions) {
      const { categoryId, description } = transaction;

      // Skip if missing categoryId, description, or not in returned category set
      if (!categoryId || !description || !categoryIdSet.has(categoryId)) {
        continue;
      }

      if (!descriptionsByCategory.has(categoryId)) {
        descriptionsByCategory.set(categoryId, new Set());
      }

      const descriptions = descriptionsByCategory.get(categoryId);
      if (descriptions) {
        // Cap at max unique descriptions per category
        if (
          descriptions.size < CATEGORY_HISTORY_MAX_DESCRIPTIONS_PER_CATEGORY
        ) {
          descriptions.add(description);
        }
      }
    }

    // Attach grouped descriptions to categories
    return categories.map((category) => ({
      ...category,
      recentDescriptions: Array.from(
        descriptionsByCategory.get(category.id) || [],
      ),
    }));
  }
}
