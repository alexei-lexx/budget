import { Connection, Edge, PaginationInput } from "../types/pagination";

export enum TransactionType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
  TRANSFER_IN = "TRANSFER_IN",
  TRANSFER_OUT = "TRANSFER_OUT",
  REFUND = "REFUND",
}

export interface TransactionFilterInput {
  accountIds?: string[];
  categoryIds?: string[];
  includeUncategorized?: boolean;
  dateAfter?: string;
  dateBefore?: string;
  types?: TransactionType[];
}

export interface Transaction {
  userId: string; // Partition key (same pattern as other entities)
  id: string; // Sort key - UUID v4
  accountId: string; // Foreign key to Account
  categoryId?: string; // Optional foreign key to Category
  type: TransactionType; // Transaction type (matches category type)
  amount: number; // Transaction amount (positive value)
  currency: string; // ISO currency code (inherited from account)
  date: string; // Transaction date (YYYY-MM-DD format)
  description?: string; // Optional description
  transferId?: string; // Optional UUID linking paired transfer transactions
  isArchived: boolean; // Soft delete flag
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface CreateTransactionInput {
  userId: string;
  accountId: string;
  categoryId?: string | null;
  type: TransactionType;
  amount: number;
  currency: string;
  date: string;
  description?: string | null;
  transferId?: string | null;
}

export type UpdateTransactionInput = Partial<
  Omit<CreateTransactionInput, "userId" | "transferId">
>;

// Transaction-specific pagination types using generic pagination interfaces
export type TransactionEdge = Edge<Transaction>;
export type TransactionConnection = Connection<Transaction>;

// Most popular combinations of account and category
// calculated based on transaction history.
export interface TransactionPattern {
  accountId: string;
  categoryId: string;
}

export interface EnrichedTransactionPattern extends TransactionPattern {
  accountName: string;
  categoryName: string;
}

// Type for transactions that support transaction patterns
export enum TransactionPatternType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
  REFUND = "REFUND",
}

export interface ITransactionRepository {
  findActiveByUserId(
    userId: string,
    pagination?: PaginationInput,
    filters?: TransactionFilterInput,
  ): Promise<TransactionConnection>;
  findActiveById(id: string, userId: string): Promise<Transaction | null>;
  findActiveByAccountId(
    accountId: string,
    userId: string,
  ): Promise<Transaction[]>;
  findActiveByTransferId(
    transferId: string,
    userId: string,
  ): Promise<Transaction[]>;
  /**
   * Find active transactions by month and transaction types
   * Supports multiple types for reports that need to factor in different transaction types
   * (e.g., EXPENSE reports factoring in REFUND transactions)
   */
  findActiveByMonthAndTypes(
    userId: string,
    year: number,
    month: number,
    types: TransactionType[],
  ): Promise<Transaction[]>;
  findActiveByDescription(
    userId: string,
    searchText: string,
    limit: number,
  ): Promise<Transaction[]>;
  findActiveByDateRange(
    userId: string,
    startDate: string,
    endDate: string,
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

// Get signed amount based on transaction type
// Positive for INCOME, REFUND, TRANSFER_IN
// Negative for EXPENSE, TRANSFER_OUT
export function getSignedAmount(transaction: Transaction): number {
  switch (transaction.type) {
    case TransactionType.INCOME:
    case TransactionType.REFUND:
    case TransactionType.TRANSFER_IN:
      return transaction.amount;
    case TransactionType.EXPENSE:
    case TransactionType.TRANSFER_OUT:
      return -transaction.amount;
    default:
      throw new Error(`Unknown transaction type: ${transaction.type}`);
  }
}
