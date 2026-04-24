import {
  Transaction,
  TransactionPattern,
  TransactionPatternType,
  TransactionType,
} from "../models/transaction";
import { DateString } from "../types/date";
import { Connection, Edge, PaginationInput } from "../types/pagination";
import { AtomicWriter } from "./atomic-writer";

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
  create(
    transaction: Readonly<Transaction>,
    atomicWriter?: AtomicWriter,
  ): Promise<void>;
  createMany(transactions: readonly Readonly<Transaction>[]): Promise<void>;
  update(
    transaction: Readonly<Transaction>,
    atomicWriter?: AtomicWriter,
  ): Promise<Transaction>;
  updateMany(
    transactions: readonly Readonly<Transaction>[],
  ): Promise<Transaction[]>;
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
