import { randomUUID } from "crypto";
import { isSupportedCurrency } from "../types/currency";
import { DateTimeString, toDateTimeString } from "../types/date-time-string";
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
  transactionBalance: number;
  isArchived: boolean;
  version: number;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

export class Account implements AccountData {
  private readonly data: Readonly<AccountData>;

  get userId() {
    return this.data.userId;
  }

  get id() {
    return this.data.id;
  }

  get name() {
    return this.data.name;
  }

  get currency() {
    return this.data.currency;
  }

  get initialBalance() {
    return this.data.initialBalance;
  }

  get transactionBalance() {
    return this.data.transactionBalance;
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
    input: CreateAccountInput,
    { idGenerator = randomUUID }: { idGenerator?: () => string } = {},
  ): Account {
    const now = toDateTimeString(new Date().toISOString());

    const data: AccountData = {
      id: idGenerator(),
      userId: input.userId,
      name: normalizeAccountName(input.name),
      currency: input.currency,
      initialBalance: input.initialBalance,
      transactionBalance: 0,
      isArchived: false,
      version: 0,
      createdAt: now,
      updatedAt: now,
    };

    return new Account(data);
  }

  static fromPersistence(data: Readonly<AccountData>): Account {
    return new Account(data);
  }

  get balance(): number {
    return this.initialBalance + this.transactionBalance;
  }

  toData(): Readonly<AccountData> {
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

  bumpVersion(): Account {
    const data: AccountData = {
      ...this.data,
      version: this.nextVersion(),
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

    const now = toDateTimeString(new Date().toISOString());

    const data: AccountData = {
      ...this.data,
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

    const now = toDateTimeString(new Date().toISOString());

    const data: AccountData = {
      ...this.data,
      isArchived: true,
      updatedAt: now,
    };

    return new Account(data);
  }

  increaseBalanceBySignedAmount(deltaAmount: number): Account {
    const data: AccountData = {
      ...this.data,
      transactionBalance: this.transactionBalance + deltaAmount,
      updatedAt: toDateTimeString(new Date().toISOString()),
    };
    return new Account(data);
  }

  decreaseBalanceBySignedAmount(deltaAmount: number): Account {
    const data: AccountData = {
      ...this.data,
      transactionBalance: this.transactionBalance - deltaAmount,
      updatedAt: toDateTimeString(new Date().toISOString()),
    };
    return new Account(data);
  }

  private constructor(
    data: Readonly<AccountData>,
    { skipInvariants = false }: { skipInvariants?: boolean } = {},
  ) {
    this.data = { ...data };

    if (!skipInvariants) {
      this.assertInvariants();
    }
  }

  private assertInvariants(): void {
    const trimmedLength = this.name.trim().length;
    if (trimmedLength < NAME_MIN_LENGTH || trimmedLength > NAME_MAX_LENGTH) {
      throw new ModelError(
        `Account name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      );
    }

    if (!isSupportedCurrency(this.currency)) {
      throw new ModelError(`Unsupported currency: ${this.currency}`);
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
