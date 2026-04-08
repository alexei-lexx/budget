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

// Plain data shape used for construction and DB hydration
export interface TransactionData {
  id: string; // Sort key - UUID v4
  userId: string; // Partition key (same pattern as other entities)
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

export class Transaction {
  readonly id: string; // Sort key - UUID v4
  readonly userId: string; // Partition key (same pattern as other entities)
  readonly accountId: string; // Foreign key to Account
  readonly categoryId?: string; // Optional foreign key to Category
  readonly type: TransactionType; // Transaction type (matches category type)
  readonly amount: number; // Transaction amount (positive value)
  readonly currency: string; // ISO currency code (inherited from account)
  readonly date: DateString; // Transaction date (YYYY-MM-DD format)
  readonly description?: string; // Optional description
  readonly transferId?: string; // Optional UUID linking paired transfer transactions
  readonly isArchived: boolean; // Soft delete flag
  readonly createdAt: string; // ISO timestamp
  readonly updatedAt: string; // ISO timestamp

  private constructor(data: TransactionData) {
    this.id = data.id;
    this.userId = data.userId;
    this.accountId = data.accountId;
    this.categoryId = data.categoryId;
    this.type = data.type;
    this.amount = data.amount;
    this.currency = data.currency;
    this.date = data.date;
    this.description = data.description;
    this.transferId = data.transferId;
    this.isArchived = data.isArchived;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // Enforces domain invariants:
  // - amount must be positive
  // - transferId must be set for TRANSFER_IN / TRANSFER_OUT
  // - transferId must be absent for all other types
  static build(data: TransactionData): Transaction {
    if (data.amount <= 0) {
      throw new Error("amount must be a positive number");
    }

    const isTransferType =
      data.type === TransactionType.TRANSFER_IN ||
      data.type === TransactionType.TRANSFER_OUT;

    if (isTransferType && !data.transferId) {
      throw new Error(`transferId is required for ${data.type}`);
    }
    if (!isTransferType && data.transferId !== undefined) {
      throw new Error(`transferId must not be set for ${data.type}`);
    }

    return new Transaction(data);
  }

  // Positive for INCOME, REFUND, TRANSFER_IN
  // Negative for EXPENSE, TRANSFER_OUT
  get signedAmount(): number {
    switch (this.type) {
      case TransactionType.INCOME:
      case TransactionType.REFUND:
      case TransactionType.TRANSFER_IN:
        return this.amount;
      case TransactionType.EXPENSE:
      case TransactionType.TRANSFER_OUT:
        return -this.amount;
      default:
        throw new Error(`Unknown transaction type: ${this.type}`);
    }
  }
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
