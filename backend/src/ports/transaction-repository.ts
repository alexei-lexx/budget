import {
  Transaction,
  TransactionPattern,
  TransactionPatternType,
  TransactionType,
} from "../models/transaction";
import { DateString } from "../types/date";
import { Connection, Edge, PaginationInput } from "../types/pagination";

export interface TransactionFilterInput {
  accountIds?: string[];
  categoryIds?: string[];
  includeUncategorized?: boolean;
  dateAfter?: DateString;
  dateBefore?: DateString;
  types?: TransactionType[];
}

// Transaction-specific pagination types using generic pagination interfaces
export type TransactionEdge = Edge<Transaction>;
export type TransactionConnection = Connection<Transaction>;

export interface UpdateTransactionInput {
  accountId?: string;
  categoryId?: string | null; // Allow null to remove category association
  type?: TransactionType;
  amount?: number;
  currency?: string;
  date?: DateString;
  description?: string | null; // Allow null to clear description
}

export interface TransactionRepository {
  findOneById(selector: {
    id: string;
    userId: string;
  }): Promise<Transaction | null>;
  findManyByUserId(
    userId: string,
    filters?: TransactionFilterInput,
  ): Promise<Transaction[]>;
  findManyByUserIdPaginated(
    userId: string,
    pagination?: PaginationInput,
    filters?: TransactionFilterInput,
  ): Promise<TransactionConnection>;
  findManyByAccountId(selector: {
    accountId: string;
    userId: string;
  }): Promise<Transaction[]>;
  findManyByTransferId(selector: {
    transferId: string;
    userId: string;
  }): Promise<Transaction[]>;
  findManyByDescription(selector: {
    userId: string;
    searchText: string;
    limit: number;
  }): Promise<Transaction[]>;
  create(transaction: Transaction): Promise<void>;
  createMany(transactions: Transaction[]): Promise<void>;
  update(
    selector: { id: string; userId: string },
    input: UpdateTransactionInput,
  ): Promise<Transaction>;
  updateMany(
    updates: { id: string; input: UpdateTransactionInput }[],
    userId: string,
  ): Promise<void>;
  archive(selector: { id: string; userId: string }): Promise<Transaction>;
  archiveMany(selector: { ids: string[]; userId: string }): Promise<void>;
  hasTransactionsForAccount(selector: {
    accountId: string;
    userId: string;
  }): Promise<boolean>;
  detectPatterns(options: {
    userId: string;
    type: TransactionPatternType;
    limit: number;
    sampleSize: number;
  }): Promise<TransactionPattern[]>;
}
