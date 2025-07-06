import { CategoryType } from "./Category";
import { PaginationInput, Edge, Connection } from "../types/pagination";

export type TransactionType = CategoryType;

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
}

export type UpdateTransactionInput = Partial<
  Omit<CreateTransactionInput, "userId">
>;

// Transaction-specific pagination types using generic pagination interfaces
export type TransactionEdge = Edge<Transaction>;
export type TransactionConnection = Connection<Transaction>;

export interface ITransactionRepository {
  findActiveByUserId(
    userId: string,
    pagination?: PaginationInput,
  ): Promise<TransactionConnection>;
  findById(id: string, userId: string): Promise<Transaction | null>;
  findByAccountId(accountId: string, userId: string): Promise<Transaction[]>;
  create(input: CreateTransactionInput): Promise<Transaction>;
  update(
    id: string,
    userId: string,
    input: UpdateTransactionInput,
  ): Promise<Transaction>;
  archive(id: string, userId: string): Promise<Transaction>;
  hasTransactionsForAccount(
    accountId: string,
    userId: string,
  ): Promise<boolean>;
}
