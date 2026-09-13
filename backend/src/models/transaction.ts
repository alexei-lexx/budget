import { randomUUID } from "crypto";
import { DateString } from "../types/date-string";
import {
  DateTimeString,
  currentDateTimeString,
} from "../types/date-time-string";
import { Account } from "./account";
import { Category, CategoryType } from "./category";
import { Archivable } from "./entity/archivable";
import { Entity } from "./entity/entity";
import { Timestampable } from "./entity/timestampable";
import { Versioned } from "./entity/versioned";
import { ModelError } from "./model-error";

export const DESCRIPTION_MAX_LENGTH = 500;

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

// Plain data shape.
export interface TransactionData {
  userId: string;
  id: string;
  accountId: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  date: DateString;
  description?: string;
  transferId?: string;
  isArchived: boolean;
  version: number;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

interface TransientRelations {
  newAccount?: Account;
  newCategory?: Category;
}

export class Transaction
  extends Archivable(Versioned(Timestampable(Entity<TransactionData>)))
  implements TransactionData
{
  get userId() {
    return this.data.userId;
  }

  get id() {
    return this.data.id;
  }

  get accountId() {
    return this.data.accountId;
  }

  get categoryId() {
    return this.data.categoryId;
  }

  get type() {
    return this.data.type;
  }

  get amount() {
    return this.data.amount;
  }

  get currency() {
    return this.data.currency;
  }

  get date() {
    return this.data.date;
  }

  get description() {
    return this.data.description;
  }

  get transferId() {
    return this.data.transferId;
  }

  static create(
    input: CreateTransactionInput,
    { idGenerator = randomUUID }: { idGenerator?: () => string } = {},
  ): Transaction {
    const { account, category } = input;
    const createdAt = currentDateTimeString();

    const data: TransactionData = {
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
      ...Transaction.archivableDefaults,
      ...Transaction.versionDefaults,
      createdAt,
      updatedAt: createdAt,
    };

    return new Transaction(data, {
      transientRelations: { newAccount: account, newCategory: category },
    });
  }

  get signedAmount(): number {
    switch (this.type) {
      case TransactionType.INCOME:
      case TransactionType.REFUND:
      case TransactionType.TRANSFER_IN:
        return this.amount;
      case TransactionType.EXPENSE:
      case TransactionType.TRANSFER_OUT:
        return -this.amount;
    }
  }

  update(input: UpdateTransactionInput): Transaction {
    this.assertNotArchived();

    const { account, category } = input;

    const newCategoryId =
      category === undefined // Keep existing category
        ? this.categoryId
        : category === null // Remove category
          ? undefined
          : category.id;

    const newDescription =
      input.description === undefined // Keep existing description
        ? this.description
        : input.description === null // Remove description
          ? undefined
          : normalizeDescription(input.description);

    const overrides: Partial<TransactionData> = {
      // Override account fields only when a new account is provided.
      ...(account && { accountId: account.id, currency: account.currency }),
      categoryId: newCategoryId,
      ...(input.type !== undefined && { type: input.type }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.date !== undefined && { date: input.date }),
      description: newDescription,
      updatedAt: currentDateTimeString(),
    };

    return this.copy(overrides, {
      transientRelations: {
        newAccount: account,
        newCategory: category ?? undefined,
      },
    });
  }

  constructor(
    data: Readonly<TransactionData>,
    {
      skipInvariants = false,
      transientRelations,
    }: {
      skipInvariants?: boolean;
      transientRelations?: TransientRelations;
    } = {},
  ) {
    // Parent's assertInvariants() takes no arguments, but this class needs
    // transientRelations, so validation is skipped and run manually below.
    super(data, { skipInvariants: true });

    if (!skipInvariants) {
      this.assertInvariants(transientRelations);
    }
  }

  protected assertInvariants(transientRelations?: TransientRelations): void {
    const newAccount = transientRelations?.newAccount;
    const newCategory = transientRelations?.newCategory;

    if (newAccount) {
      if (newAccount.userId !== this.userId) {
        throw new ModelError("Account does not belong to user");
      }

      if (newAccount.isArchived) {
        throw new ModelError("Account must not be archived");
      }
    }

    if (this.amount <= 0) {
      throw new ModelError("Amount must be positive");
    }

    const isTransfer =
      this.type === TransactionType.TRANSFER_IN ||
      this.type === TransactionType.TRANSFER_OUT;

    if (isTransfer && this.categoryId) {
      throw new ModelError("Transfer transactions cannot have a category");
    }

    if (isTransfer) {
      if (!this.transferId) {
        throw new ModelError("Transfer transactions must include transferId");
      }
    } else {
      if (this.transferId) {
        throw new ModelError(
          "Only transfer transactions can include transferId",
        );
      }
    }

    if (newCategory) {
      if (newCategory.userId !== this.userId) {
        throw new ModelError("Category does not belong to user");
      }

      if (newCategory.isArchived) {
        throw new ModelError("Category must not be archived");
      }

      const typeMismatch =
        (newCategory.type === CategoryType.INCOME &&
          this.type !== TransactionType.INCOME) ||
        (newCategory.type === CategoryType.EXPENSE &&
          this.type !== TransactionType.EXPENSE &&
          this.type !== TransactionType.REFUND);

      if (typeMismatch) {
        throw new ModelError("Category type does not match transaction type");
      }
    }

    if (this.description && this.description.length > DESCRIPTION_MAX_LENGTH) {
      throw new ModelError(
        `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`,
      );
    }
  }
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

export interface UpdateTransactionInput {
  account?: Account;
  category?: Category | null;
  type?: TransactionType;
  amount?: number;
  date?: DateString;
  description?: string | null;
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

function normalizeDescription(description?: string | null): string | undefined {
  return description?.trim() || undefined;
}
