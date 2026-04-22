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
  const { account, category } = input;
  const now = clock().toISOString();

  const transaction: Transaction = {
    id: idGenerator(),
    userId: input.userId,
    accountId: account.id,
    categoryId: category?.id,
    type: input.type,
    amount: input.amount,
    currency: account.currency,
    date: input.date,
    description: normalizeDescription(input.description),
    transferId: input.transferId,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };

  assertTransactionInvariants({
    transaction,
    newAccount: account,
    newCategory: category,
  });

  return transaction;
}

export interface UpdateTransactionInput {
  account?: Account;
  category?: Category | null;
  type?: TransactionType;
  amount?: number;
  date?: DateString;
  description?: string | null;
}

export function updateTransactionModel(
  transaction: Transaction,
  input: UpdateTransactionInput,
  { clock = () => new Date() }: { clock?: () => Date } = {},
): Transaction {
  if (transaction.isArchived) {
    throw new ModelError("Cannot update archived transaction");
  }

  const { account, category } = input;
  const now = clock().toISOString();

  const newCategoryId =
    category === undefined // Not overriding category
      ? transaction.categoryId
      : category === null // Explicitly removing category
        ? undefined
        : category.id;

  const newDescription =
    input.description === undefined // Not overriding description
      ? transaction.description
      : input.description === null // Explicitly removing description
        ? undefined
        : normalizeDescription(input.description);

  const updatedTransaction: Transaction = {
    ...transaction,
    accountId: account ? account.id : transaction.accountId,
    categoryId: newCategoryId,
    type: input.type ?? transaction.type,
    amount: input.amount ?? transaction.amount,
    currency: account ? account.currency : transaction.currency,
    date: input.date ?? transaction.date,
    description: newDescription,
    updatedAt: now,
  };

  assertTransactionInvariants({
    transaction: updatedTransaction,
    newAccount: account,
    newCategory: category ?? undefined,
  });

  return updatedTransaction;
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

function assertTransactionInvariants({
  transaction,
  newAccount,
  newCategory,
}: {
  transaction: Transaction;
  newAccount?: Account;
  newCategory?: Category;
}): void {
  if (newAccount) {
    if (newAccount.userId !== transaction.userId) {
      throw new ModelError("Account does not belong to user");
    }

    if (newAccount.isArchived) {
      throw new ModelError("Account must not be archived");
    }
  }

  if (transaction.amount <= 0) {
    throw new ModelError("Amount must be positive");
  }

  const isTransfer =
    transaction.type === TransactionType.TRANSFER_IN ||
    transaction.type === TransactionType.TRANSFER_OUT;

  if (isTransfer && newCategory) {
    throw new ModelError("Transfer transactions cannot have a category");
  }

  if (isTransfer) {
    if (!transaction.transferId) {
      throw new ModelError("Transfer transactions must include transferId");
    }
  } else {
    if (transaction.transferId) {
      throw new ModelError("Only transfer transactions can include transferId");
    }
  }

  if (newCategory) {
    if (newCategory.userId !== transaction.userId) {
      throw new ModelError("Category does not belong to user");
    }

    if (newCategory.isArchived) {
      throw new ModelError("Category must not be archived");
    }

    const typeMismatch =
      (newCategory.type === CategoryType.INCOME &&
        transaction.type !== TransactionType.INCOME) ||
      (newCategory.type === CategoryType.EXPENSE &&
        transaction.type !== TransactionType.EXPENSE &&
        transaction.type !== TransactionType.REFUND);

    if (typeMismatch) {
      throw new ModelError("Category type does not match transaction type");
    }
  }

  if (
    transaction.description &&
    transaction.description.length > DESCRIPTION_MAX_LENGTH
  ) {
    throw new ModelError(
      `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`,
    );
  }
}

function normalizeDescription(description?: string | null): string | undefined {
  return description?.trim() || undefined;
}
