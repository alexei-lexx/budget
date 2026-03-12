import { DateString } from "../types/date";

export enum TransactionType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
  TRANSFER_IN = "TRANSFER_IN",
  TRANSFER_OUT = "TRANSFER_OUT",
  REFUND = "REFUND",
}

export type NonTransferTransactionType = Exclude<
  TransactionType,
  TransactionType.TRANSFER_IN | TransactionType.TRANSFER_OUT
>;

export interface Transaction {
  userId: string; // Partition key (same pattern as other entities)
  id: string; // Sort key - UUID v4
  accountId: string; // Foreign key to Account
  categoryId?: string; // Optional foreign key to Category
  type: TransactionType; // Transaction type (matches category type)
  amount: number; // Transaction amount (positive value)
  currency: string; // ISO currency code (inherited from account)
  date: DateString; // Transaction date (YYYY-MM-DD format)
  description?: string; // Optional description
  transferId?: string; // Optional UUID linking paired transfer transactions
  isArchived: boolean; // Soft delete flag
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

// Most popular combinations of account and category
// calculated based on transaction history.
export interface TransactionPattern {
  accountId: string;
  categoryId: string;
}

// Type for transactions that support transaction patterns
export enum TransactionPatternType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
  REFUND = "REFUND",
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
