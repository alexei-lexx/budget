import { randomUUID } from "crypto";
import {
  DateTimeString,
  currentDateTimeString,
} from "../types/date-time-string";
import { isSupportedInterfaceLanguage } from "../types/language";
import { validateEmail } from "../utils/email";
import { Entity } from "./entity/entity";
import { Timestampable } from "./entity/timestampable";
import { ModelError } from "./model-error";

// Plain data shape.
export interface UserData {
  id: string;
  email: string;
  interfaceLanguage?: string;
  mcpToken: string;
  transactionPatternsLimit?: number;
  voiceInputLanguage?: string;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

/**
 * No isArchived: there is no user-deletion feature today, so soft-deletion
 * is an intentional exception to the constitution's soft-deletion rule.
 */
export class User extends Timestampable(Entity<UserData>) implements UserData {
  get id() {
    return this.data.id;
  }

  get email() {
    return this.data.email;
  }

  get interfaceLanguage() {
    return this.data.interfaceLanguage;
  }

  get mcpToken() {
    return this.data.mcpToken;
  }

  get transactionPatternsLimit() {
    return this.data.transactionPatternsLimit;
  }

  get voiceInputLanguage() {
    return this.data.voiceInputLanguage;
  }

  get createdAt() {
    return this.data.createdAt;
  }

  get updatedAt() {
    return this.data.updatedAt;
  }

  static create(
    input: CreateUserInput,
    {
      idGenerator = randomUUID,
      tokenGenerator = randomUUID,
    }: { idGenerator?: () => string; tokenGenerator?: () => string } = {},
  ): User {
    const createdAt = currentDateTimeString();
    const updatedAt = createdAt;

    const data: UserData = {
      id: idGenerator(),
      email: normalizeEmail(input.email),
      mcpToken: tokenGenerator(),
      createdAt,
      updatedAt,
    };

    return new User(data);
  }

  update(input: UpdateUserInput): User {
    return this.copy({
      ...(input.interfaceLanguage !== undefined && {
        interfaceLanguage: input.interfaceLanguage,
      }),
      ...(input.transactionPatternsLimit !== undefined && {
        transactionPatternsLimit: input.transactionPatternsLimit,
      }),
      ...(input.voiceInputLanguage !== undefined && {
        voiceInputLanguage: input.voiceInputLanguage,
      }),
      updatedAt: currentDateTimeString(),
    });
  }

  regenerateMcpToken({
    tokenGenerator = randomUUID,
  }: { tokenGenerator?: () => string } = {}): User {
    return this.copy({
      mcpToken: tokenGenerator(),
      updatedAt: currentDateTimeString(),
    });
  }

  protected assertInvariants(): void {
    if (this.email.length === 0) {
      throw new ModelError("Email must be a non-empty string");
    }

    if (!validateEmail(this.email)) {
      throw new ModelError(`Invalid email: ${this.email}`);
    }

    if (
      this.interfaceLanguage !== undefined &&
      !isSupportedInterfaceLanguage(this.interfaceLanguage)
    ) {
      throw new ModelError(
        `Unsupported interface language: ${this.interfaceLanguage}`,
      );
    }

    if (this.mcpToken.length === 0) {
      throw new ModelError("MCP token must be a non-empty string");
    }

    if (
      this.transactionPatternsLimit !== undefined &&
      (!Number.isInteger(this.transactionPatternsLimit) ||
        this.transactionPatternsLimit < 0)
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
  interfaceLanguage?: string;
  transactionPatternsLimit?: number;
  voiceInputLanguage?: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().normalize("NFC");
}
