import {
  Transaction,
  TransactionPattern,
  TransactionPatternType,
  TransactionType,
} from "../../models/transaction";
import { DateString } from "../../types/date";
import { Connection, Edge, PaginationInput } from "../../types/pagination";

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

export interface CreateTransactionInput {
  userId: string;
  accountId: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  date: DateString;
  description?: string;
  transferId?: string;
}

export type UpdateTransactionInput = Partial<
  Omit<
    CreateTransactionInput,
    "categoryId" | "description" | "transferId" | "userId"
  >
> & {
  categoryId?: string | null; // Allow null to remove category association
  description?: string | null; // Allow null to clear description
};

export interface TransactionRepository {
  findOneActiveById(id: string, userId: string): Promise<Transaction | null>;
  findManyActiveByUserId(
    userId: string,
    filters?: TransactionFilterInput,
  ): Promise<Transaction[]>;
  findManyActiveByUserIdPaginated(
    userId: string,
    pagination?: PaginationInput,
    filters?: TransactionFilterInput,
  ): Promise<TransactionConnection>;
  findManyActiveByAccountId(
    accountId: string,
    userId: string,
  ): Promise<Transaction[]>;
  findManyActiveByTransferId(
    transferId: string,
    userId: string,
  ): Promise<Transaction[]>;
  findManyActiveByDescription(
    userId: string,
    searchText: string,
    limit: number,
  ): Promise<Transaction[]>;
  create(input: CreateTransactionInput): Promise<Transaction>;
  createMany(inputs: CreateTransactionInput[]): Promise<Transaction[]>;
  update(
    id: string,
    userId: string,
    input: UpdateTransactionInput,
  ): Promise<Transaction>;
  updateMany(
    updates: { id: string; input: UpdateTransactionInput }[],
    userId: string,
  ): Promise<void>;
  archive(id: string, userId: string): Promise<Transaction>;
  archiveMany(ids: string[], userId: string): Promise<void>;
  hasTransactionsForAccount(
    accountId: string,
    userId: string,
  ): Promise<boolean>;
  detectPatterns(
    userId: string,
    type: TransactionPatternType,
    limit: number,
    sampleSize: number,
  ): Promise<TransactionPattern[]>;
}
