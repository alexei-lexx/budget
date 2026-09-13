import { randomUUID } from "crypto";
import { DateTimeString, toDateTimeString } from "../types/date-time-string";
import { ModelError } from "./model-error";

export enum TelegramBotStatus {
  /** Webhook registration in progress; not yet usable */
  PENDING = "PENDING",
  /** Webhook registered and active; receives inbound messages */
  CONNECTED = "CONNECTED",
  /** Disconnect requested; webhook being removed */
  DELETING = "DELETING",
}

// Plain data shape.
export interface TelegramBotData {
  id: string;
  userId: string;
  token: string;
  webhookSecret: string;
  status: TelegramBotStatus;
  isArchived: boolean;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

export class TelegramBot implements TelegramBotData {
  private readonly data: Readonly<TelegramBotData>;

  get id() {
    return this.data.id;
  }

  get userId() {
    return this.data.userId;
  }

  get token() {
    return this.data.token;
  }

  get webhookSecret() {
    return this.data.webhookSecret;
  }

  get status() {
    return this.data.status;
  }

  get isArchived() {
    return this.data.isArchived;
  }

  get createdAt() {
    return this.data.createdAt;
  }

  get updatedAt() {
    return this.data.updatedAt;
  }

  static create(
    input: CreateTelegramBotInput,
    {
      idGenerator = randomUUID,
      webhookSecretGenerator = randomUUID,
    }: {
      idGenerator?: () => string;
      webhookSecretGenerator?: () => string;
    } = {},
  ): TelegramBot {
    const now = toDateTimeString(new Date().toISOString());

    const data: TelegramBotData = {
      id: idGenerator(),
      userId: input.userId,
      token: input.token.trim(),
      webhookSecret: webhookSecretGenerator(),
      status: TelegramBotStatus.PENDING,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };

    return new TelegramBot(data);
  }

  static fromPersistence(data: Readonly<TelegramBotData>): TelegramBot {
    return new TelegramBot(data);
  }

  toData(): Readonly<TelegramBotData> {
    return {
      ...this.data,
    };
  }

  connect(): TelegramBot {
    if (this.status !== TelegramBotStatus.PENDING) {
      throw new ModelError("Cannot connect bot that is not pending");
    }

    const data: TelegramBotData = {
      ...this.data,
      status: TelegramBotStatus.CONNECTED,
      updatedAt: toDateTimeString(new Date().toISOString()),
    };

    return new TelegramBot(data);
  }

  disconnect(): TelegramBot {
    if (this.status !== TelegramBotStatus.CONNECTED) {
      throw new ModelError("Cannot disconnect bot that is not connected");
    }

    const data: TelegramBotData = {
      ...this.data,
      status: TelegramBotStatus.DELETING,
      updatedAt: toDateTimeString(new Date().toISOString()),
    };

    return new TelegramBot(data);
  }

  archive(): TelegramBot {
    if (this.isArchived) {
      throw new ModelError("Cannot archive archived telegram bot");
    }

    const now = toDateTimeString(new Date().toISOString());

    const data: TelegramBotData = {
      ...this.data,
      isArchived: true,
      updatedAt: now,
    };

    return new TelegramBot(data);
  }

  private constructor(data: Readonly<TelegramBotData>) {
    this.data = { ...data };
    this.assertInvariants();
  }

  private assertInvariants(): void {
    if (!this.token) {
      throw new ModelError("Telegram bot token is required");
    }

    if (!this.webhookSecret) {
      throw new ModelError("Telegram bot webhook secret is required");
    }
  }
}

export interface CreateTelegramBotInput {
  userId: string;
  token: string;
}
