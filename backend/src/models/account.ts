import { randomUUID } from "crypto";
import { isSupportedCurrency } from "../types/currency";
import {
  DateTimeString,
  currentDateTimeString,
} from "../types/date-time-string";
import { Archivable } from "./entity/archivable";
import { Entity } from "./entity/entity";
import { Timestampable } from "./entity/timestampable";
import { Versioned } from "./entity/versioned";
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

export class Account
  extends Archivable(Versioned(Timestampable(Entity<AccountData>)))
  implements AccountData
{
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

  get balance(): number {
    return this.initialBalance + this.transactionBalance;
  }

  static create(
    input: CreateAccountInput,
    { idGenerator = randomUUID }: { idGenerator?: () => string } = {},
  ): Account {
    const createdAt = currentDateTimeString();
    const updatedAt = createdAt;

    const data: AccountData = {
      id: idGenerator(),
      userId: input.userId,
      name: normalizeAccountName(input.name),
      currency: input.currency,
      initialBalance: input.initialBalance,
      transactionBalance: 0,
      ...Account.archivableDefaults,
      ...Account.versionDefaults,
      createdAt,
      updatedAt,
    };

    return new Account(data);
  }

  update(input: UpdateAccountInput): Account {
    this.assertNotArchived();

    return this.copy({
      ...(input.name !== undefined && {
        name: normalizeAccountName(input.name),
      }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.initialBalance !== undefined && {
        initialBalance: input.initialBalance,
      }),
      updatedAt: currentDateTimeString(),
    });
  }

  increaseBalanceBySignedAmount(deltaAmount: number): Account {
    return this.copy({
      transactionBalance: this.transactionBalance + deltaAmount,
      updatedAt: currentDateTimeString(),
    });
  }

  decreaseBalanceBySignedAmount(deltaAmount: number): Account {
    return this.copy({
      transactionBalance: this.transactionBalance - deltaAmount,
      updatedAt: currentDateTimeString(),
    });
  }

  protected assertInvariants(): void {
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
