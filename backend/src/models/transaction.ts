import { randomUUID } from "crypto";
import { DateString } from "../types/date-string";
import { DateTimeString, toDateTimeString } from "../types/date-time-string";
import { Account } from "./account";
import { Category, CategoryType } from "./category";
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

export class Transaction implements TransactionData {
  private readonly data: Readonly<TransactionData>;

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

  get isArchived() {
    return this.data.isArchived;
  }

  get version() {
    return this.data.version;
  }

  get createdAt() {
    return this.data.createdAt;
  }

  get updatedAt() {
    return this.data.updatedAt;
  }

  static create(
    input: CreateTransactionInput,
    { idGenerator = randomUUID }: { idGenerator?: () => string } = {},
  ): Transaction {
    const { account, category } = input;
    const now = toDateTimeString(new Date().toISOString());

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
      isArchived: false,
      version: 0,
      createdAt: now,
      updatedAt: now,
    };

    return new Transaction(data, {
      newAccount: account,
      newCategory: category,
    });
  }

  static fromPersistence(data: Readonly<TransactionData>): Transaction {
    return new Transaction(data);
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

  toData(): Readonly<TransactionData> {
    return {
      ...this.data,
    };
  }

  /**
   * Returns the version this entity will have once persisted.
   */
  nextVersion(): number {
    return this.version + 1;
  }

  bumpVersion(): Transaction {
    return new Transaction(
      {
        ...this.data,
        version: this.nextVersion(),
      },
      undefined,
      // Version bump leaves all invariant-bearing fields unchanged.
      { skipInvariants: true },
    );
  }

  update(input: UpdateTransactionInput): Transaction {
    if (this.isArchived) {
      throw new ModelError("Cannot update archived transaction");
    }

    const { account, category } = input;
    const now = toDateTimeString(new Date().toISOString());

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

    const data: TransactionData = {
      ...this.data,
      // Override account fields only when a new account is provided.
      ...(account && { accountId: account.id, currency: account.currency }),
      categoryId: newCategoryId,
      type: input.type ?? this.type,
      amount: input.amount ?? this.amount,
      date: input.date ?? this.date,
      description: newDescription,
      updatedAt: now,
    };

    return new Transaction(data, {
      newAccount: account,
      newCategory: category ?? undefined,
    });
  }

  archive(): Transaction {
    if (this.isArchived) {
      throw new ModelError("Cannot archive archived transaction");
    }

    const now = toDateTimeString(new Date().toISOString());

    const data: TransactionData = {
      ...this.data,
      isArchived: true,
      updatedAt: now,
    };

    return new Transaction(data);
  }

  private constructor(
    data: Readonly<TransactionData>,
    transientRelations?: { newAccount?: Account; newCategory?: Category },
    { skipInvariants = false }: { skipInvariants?: boolean } = {},
  ) {
    this.data = { ...data };

    if (!skipInvariants) {
      this.assertInvariants(transientRelations);
    }
  }

  private assertInvariants(transientRelations?: {
    newAccount?: Account;
    newCategory?: Category;
  }): void {
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
