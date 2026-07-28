import { randomUUID } from "crypto";
import { validateEmail } from "../utils/email";
import { ModelError } from "./model-error";

// Plain data shape.
export interface UserData {
  id: string;
  email: string;
  mcpToken: string;
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
  readonly mcpToken: string;
  readonly transactionPatternsLimit?: number;
  readonly voiceInputLanguage?: string;
  readonly createdAt: string;
  readonly updatedAt: string;

  static create(
    input: CreateUserInput,
    {
      idGenerator = randomUUID,
      tokenGenerator = randomUUID,
    }: { idGenerator?: () => string; tokenGenerator?: () => string } = {},
  ): User {
    const now = new Date().toISOString();

    const data: UserData = {
      id: idGenerator(),
      email: normalizeEmail(input.email),
      mcpToken: tokenGenerator(),
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
      mcpToken: this.mcpToken,
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

  regenerateMcpToken({
    tokenGenerator = randomUUID,
  }: { tokenGenerator?: () => string } = {}): User {
    const now = new Date().toISOString();

    const data: UserData = {
      ...this.toData(),
      mcpToken: tokenGenerator(),
      updatedAt: now,
    };

    return new User(data);
  }

  private constructor(data: UserData) {
    User.assertInvariants(data);

    this.id = data.id;
    this.email = data.email;
    this.mcpToken = data.mcpToken;
    this.transactionPatternsLimit = data.transactionPatternsLimit;
    this.voiceInputLanguage = data.voiceInputLanguage;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  private static assertInvariants(data: UserData): void {
    if (data.email.length === 0) {
      throw new ModelError("Email must be a non-empty string");
    }

    if (!validateEmail(data.email)) {
      throw new ModelError(`Invalid email: ${data.email}`);
    }

    if (data.mcpToken.length === 0) {
      throw new ModelError("MCP token must be a non-empty string");
    }

    if (
      data.transactionPatternsLimit !== undefined &&
      (!Number.isInteger(data.transactionPatternsLimit) ||
        data.transactionPatternsLimit < 0)
    ) {
      throw new ModelError(
        "Transaction patterns limit must be a non-negative integer",
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
