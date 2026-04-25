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

// Plain data shape.
// Used anywhere a value (not a domain object) is needed.
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
  createdAt: string;
  updatedAt: string;
}

export interface Transaction extends TransactionData {
  readonly signedAmount: number;
  toData(): TransactionData;
  bumpVersion(): Transaction;
  update(
    input: UpdateTransactionInput,
    deps?: { clock?: () => Date },
  ): Transaction;
  archive(deps?: { clock?: () => Date }): Transaction;
}

export class TransactionEntity implements Transaction {
  readonly userId: string;
  readonly id: string;
  readonly accountId: string;
  readonly categoryId?: string;
  readonly type: TransactionType;
  readonly amount: number;
  readonly currency: string;
  readonly date: DateString;
  readonly description?: string;
  readonly transferId?: string;
  readonly isArchived: boolean;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;

  static create(
    input: CreateTransactionInput,
    {
      clock = () => new Date(),
      idGenerator = randomUUID,
    }: { clock?: () => Date; idGenerator?: () => string } = {},
  ) {
    const { account, category } = input;
    const now = clock().toISOString();

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

    return new TransactionEntity(data, {
      newAccount: account,
      newCategory: category,
    });
  }

  static fromPersistence(data: TransactionData): TransactionEntity {
    return new TransactionEntity(data);
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
      default:
        throw new Error(`Unknown transaction type: ${this.type}`);
    }
  }

  toData(): TransactionData {
    return {
      userId: this.userId,
      id: this.id,
      accountId: this.accountId,
      categoryId: this.categoryId,
      type: this.type,
      amount: this.amount,
      currency: this.currency,
      date: this.date,
      description: this.description,
      transferId: this.transferId,
      isArchived: this.isArchived,
      version: this.version,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  bumpVersion() {
    return new TransactionEntity(
      {
        ...this.toData(),
        version: this.version + 1,
      },
      undefined,
      { skipInvariants: true },
    );
  }

  update(
    input: UpdateTransactionInput,
    { clock = () => new Date() }: { clock?: () => Date } = {},
  ): TransactionEntity {
    if (this.isArchived) {
      throw new ModelError("Cannot update archived transaction");
    }

    const { account, category } = input;
    const now = clock().toISOString();

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
      ...this.toData(),
      ...(account && { accountId: account.id, currency: account.currency }),
      categoryId: newCategoryId,
      type: input.type ?? this.type,
      amount: input.amount ?? this.amount,
      date: input.date ?? this.date,
      description: newDescription,
      updatedAt: now,
    };

    return new TransactionEntity(data, {
      newAccount: account,
      newCategory: category ?? undefined,
    });
  }

  archive({
    clock = () => new Date(),
  }: { clock?: () => Date } = {}): TransactionEntity {
    if (this.isArchived) {
      throw new ModelError("Cannot archive archived transaction");
    }

    const now = clock().toISOString();

    const data: TransactionData = {
      ...this.toData(),
      isArchived: true,
      updatedAt: now,
    };

    return new TransactionEntity(data);
  }

  private constructor(
    data: TransactionData,
    transientRelations?: { newAccount?: Account; newCategory?: Category },
    { skipInvariants = false }: { skipInvariants?: boolean } = {},
  ) {
    if (!skipInvariants) {
      TransactionEntity.assertInvariants(data, transientRelations);
    }

    this.userId = data.userId;
    this.id = data.id;
    this.accountId = data.accountId;
    this.categoryId = data.categoryId;
    this.type = data.type;
    this.amount = data.amount;
    this.currency = data.currency;
    this.date = data.date;
    this.description = data.description;
    this.transferId = data.transferId;
    this.isArchived = data.isArchived;
    this.version = data.version;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  private static assertInvariants(
    data: TransactionData,
    transientRelations?: { newAccount?: Account; newCategory?: Category },
  ): void {
    const newAccount = transientRelations?.newAccount;
    const newCategory = transientRelations?.newCategory;

    if (newAccount) {
      if (newAccount.userId !== data.userId) {
        throw new ModelError("Account does not belong to user");
      }

      if (newAccount.isArchived) {
        throw new ModelError("Account must not be archived");
      }
    }

    if (data.amount <= 0) {
      throw new ModelError("Amount must be positive");
    }

    const isTransfer =
      data.type === TransactionType.TRANSFER_IN ||
      data.type === TransactionType.TRANSFER_OUT;

    if (isTransfer && newCategory) {
      throw new ModelError("Transfer transactions cannot have a category");
    }

    if (isTransfer) {
      if (!data.transferId) {
        throw new ModelError("Transfer transactions must include transferId");
      }
    } else {
      if (data.transferId) {
        throw new ModelError(
          "Only transfer transactions can include transferId",
        );
      }
    }

    if (newCategory) {
      if (newCategory.userId !== data.userId) {
        throw new ModelError("Category does not belong to user");
      }

      if (newCategory.isArchived) {
        throw new ModelError("Category must not be archived");
      }

      const typeMismatch =
        (newCategory.type === CategoryType.INCOME &&
          data.type !== TransactionType.INCOME) ||
        (newCategory.type === CategoryType.EXPENSE &&
          data.type !== TransactionType.EXPENSE &&
          data.type !== TransactionType.REFUND);

      if (typeMismatch) {
        throw new ModelError("Category type does not match transaction type");
      }
    }

    if (data.description && data.description.length > DESCRIPTION_MAX_LENGTH) {
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
