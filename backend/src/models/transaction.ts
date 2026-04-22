import { randomUUID } from "crypto";
import { DateString } from "../types/date";
import { DESCRIPTION_MAX_LENGTH } from "../types/validation";
import { Account } from "./account";
import { Category, CategoryType } from "./category";
import { ModelError } from "./model-error";

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

export interface CreateTransactionInput {
  userId: string;
  account: Account;
  category?: Category;
  type: TransactionType;
  amount: number;
  date: DateString;
  description?: string;
  transferId?: string;
}

export function createTransactionModel(
  input: CreateTransactionInput,
  {
    clock = () => new Date(),
    idGenerator = randomUUID,
  }: { clock?: () => Date; idGenerator?: () => string } = {},
): Transaction {
  const {
    account,
    amount,
    category,
    date,
    description,
    transferId,
    type,
    userId,
  } = input;

  if (account.userId !== userId) {
    throw new ModelError("Account does not belong to user");
  }

  if (account.isArchived) {
    throw new ModelError("Cannot create transaction for archived account");
  }

  if (amount <= 0) {
    throw new ModelError("Transaction amount must be positive");
  }

  const isTransfer =
    type === TransactionType.TRANSFER_IN ||
    type === TransactionType.TRANSFER_OUT;

  if (isTransfer && category) {
    throw new ModelError("Transfer transactions cannot have a category");
  }

  if (category) {
    if (category.userId !== userId) {
      throw new ModelError("Category does not belong to user");
    }

    if (category.isArchived) {
      throw new ModelError("Cannot create transaction for archived category");
    }

    const typeMismatch =
      (category.type === CategoryType.INCOME &&
        type !== TransactionType.INCOME) ||
      (category.type === CategoryType.EXPENSE &&
        type !== TransactionType.EXPENSE &&
        type !== TransactionType.REFUND);

    if (typeMismatch) {
      throw new ModelError("Category type does not match transaction type");
    }
  }

  const normalizedDescription = description?.trim() || undefined;

  if (
    normalizedDescription &&
    normalizedDescription.length > DESCRIPTION_MAX_LENGTH
  ) {
    throw new ModelError(
      `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`,
    );
  }

  if (isTransfer) {
    if (!transferId) {
      throw new ModelError("Transfer transactions must include transferId");
    }
  } else {
    if (transferId) {
      throw new ModelError("Only transfer transactions can include transferId");
    }
  }

  const id = idGenerator();
  const currency = account.currency;
  const now = clock().toISOString();

  const transaction: Transaction = {
    id,
    userId,
    accountId: account.id,
    categoryId: category?.id,
    type,
    amount,
    currency,
    date,
    description: normalizedDescription,
    transferId,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };

  return transaction;
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
