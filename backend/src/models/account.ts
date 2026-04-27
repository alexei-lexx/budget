import { randomUUID } from "crypto";
import { isSupportedCurrency } from "../types/currency";
import { ModelError } from "./model-error";

export const NAME_MIN_LENGTH = 1;
export const NAME_MAX_LENGTH = 100;

// Plain data shape.
export interface AccountData {
  userId: string;
  id: string;
  name: string;
  currency: string;
  initialBalance: number;
  isArchived: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export class Account implements AccountData {
  readonly userId: string;
  readonly id: string;
  readonly name: string;
  readonly currency: string;
  readonly initialBalance: number;
  readonly isArchived: boolean;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;

  static create(
    input: CreateAccountInput,
    {
      idGenerator = randomUUID,
    }: { idGenerator?: () => string } = {},
  ): Account {
    const now = new Date().toISOString();

    const data: AccountData = {
      id: idGenerator(),
      userId: input.userId,
      name: normalizeAccountName(input.name),
      currency: input.currency,
      initialBalance: input.initialBalance,
      isArchived: false,
      version: 0,
      createdAt: now,
      updatedAt: now,
    };

    return new Account(data);
  }

  static fromPersistence(data: AccountData): Account {
    return new Account(data);
  }

  toData(): AccountData {
    return {
      userId: this.userId,
      id: this.id,
      name: this.name,
      currency: this.currency,
      initialBalance: this.initialBalance,
      isArchived: this.isArchived,
      version: this.version,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  bumpVersion(): Account {
    const data: AccountData = {
      ...this.toData(),
      version: this.version + 1,
    };

    return new Account(
      data,
      // Version bump leaves all invariant-bearing fields unchanged.
      { skipInvariants: true },
    );
  }

  update(input: UpdateAccountInput): Account {
    if (this.isArchived) {
      throw new ModelError("Cannot update archived account");
    }

    const now = new Date().toISOString();

    const data: AccountData = {
      ...this.toData(),
      name:
        input.name !== undefined ? normalizeAccountName(input.name) : this.name,
      currency: input.currency ?? this.currency,
      initialBalance: input.initialBalance ?? this.initialBalance,
      updatedAt: now,
    };

    return new Account(data);
  }

  archive(): Account {
    if (this.isArchived) {
      throw new ModelError("Cannot archive archived account");
    }

    const now = new Date().toISOString();

    const data: AccountData = {
      ...this.toData(),
      isArchived: true,
      updatedAt: now,
    };

    return new Account(data);
  }

  private constructor(
    data: AccountData,
    { skipInvariants = false }: { skipInvariants?: boolean } = {},
  ) {
    if (!skipInvariants) {
      Account.assertInvariants(data);
    }

    this.userId = data.userId;
    this.id = data.id;
    this.name = data.name;
    this.currency = data.currency;
    this.initialBalance = data.initialBalance;
    this.isArchived = data.isArchived;
    this.version = data.version;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  private static assertInvariants(data: AccountData): void {
    const trimmedLength = data.name.trim().length;
    if (trimmedLength < NAME_MIN_LENGTH || trimmedLength > NAME_MAX_LENGTH) {
      throw new ModelError(
        `Account name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      );
    }

    if (!isSupportedCurrency(data.currency)) {
      throw new ModelError(`Unsupported currency: ${data.currency}`);
    }
  }
}

export interface CreateAccountInput {
  userId: string;
  name: string;
  currency: string;
  initialBalance: number;
}

export interface UpdateAccountInput {
  name?: string;
  currency?: string;
  initialBalance?: number;
}

function normalizeAccountName(name: string): string {
  return name.trim();
}
