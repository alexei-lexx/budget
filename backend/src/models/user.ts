import { randomUUID } from "crypto";
import { validateEmail } from "../utils/email";
import { ModelError } from "./model-error";

export const MIN_TRANSACTION_PATTERNS_LIMIT = 1;
export const MAX_TRANSACTION_PATTERNS_LIMIT = 10;
export const DEFAULT_TRANSACTION_PATTERNS_LIMIT = 3;

// Plain data shape.
export interface UserData {
  id: string;
  email: string;
  transactionPatternsLimit?: number;
  voiceInputLanguage?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * No isArchived: there is no user-deletion feature today, so soft-deletion
 * is an intentional exception to the constitution's soft-deletion rule.
 */
export class User implements UserData {
  readonly id: string;
  readonly email: string;
  readonly transactionPatternsLimit?: number;
  readonly voiceInputLanguage?: string;
  readonly createdAt: string;
  readonly updatedAt: string;

  static create(
    input: CreateUserInput,
    { idGenerator = randomUUID }: { idGenerator?: () => string } = {},
  ): User {
    const now = new Date().toISOString();

    const data: UserData = {
      id: idGenerator(),
      email: normalizeEmail(input.email),
      createdAt: now,
      updatedAt: now,
    };

    return new User(data);
  }

  static fromPersistence(data: UserData): User {
    return new User(data);
  }

  toData(): UserData {
    return {
      id: this.id,
      email: this.email,
      transactionPatternsLimit: this.transactionPatternsLimit,
      voiceInputLanguage: this.voiceInputLanguage,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  update(input: UpdateUserInput): User {
    const now = new Date().toISOString();

    const data: UserData = {
      ...this.toData(),
      transactionPatternsLimit:
        input.transactionPatternsLimit ?? this.transactionPatternsLimit,
      voiceInputLanguage: input.voiceInputLanguage ?? this.voiceInputLanguage,
      updatedAt: now,
    };

    return new User(data);
  }

  private constructor(data: UserData) {
    User.assertInvariants(data);

    this.id = data.id;
    this.email = data.email;
    this.transactionPatternsLimit = data.transactionPatternsLimit;
    this.voiceInputLanguage = data.voiceInputLanguage;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  private static assertInvariants(data: UserData): void {
    if (!validateEmail(data.email)) {
      throw new ModelError(`Invalid email address: ${data.email}`);
    }

    if (
      data.transactionPatternsLimit !== undefined &&
      (!Number.isInteger(data.transactionPatternsLimit) ||
        data.transactionPatternsLimit < MIN_TRANSACTION_PATTERNS_LIMIT ||
        data.transactionPatternsLimit > MAX_TRANSACTION_PATTERNS_LIMIT)
    ) {
      throw new ModelError(
        `Transaction patterns limit must be an integer between ${MIN_TRANSACTION_PATTERNS_LIMIT} and ${MAX_TRANSACTION_PATTERNS_LIMIT}`,
      );
    }
  }
}

export interface CreateUserInput {
  email: string;
}

export interface UpdateUserInput {
  transactionPatternsLimit?: number;
  voiceInputLanguage?: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().normalize("NFC");
}
