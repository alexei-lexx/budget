import { randomUUID } from "crypto";
import { DateTimeString, toDateTimeString } from "../types/date-time-string";
import { ModelError } from "./model-error";

export const DEFAULT_CHAT_HISTORY_MAX_MESSAGES = 20;
export const DEFAULT_CHAT_MESSAGE_TTL_SECONDS = 86400; // 24 hours in seconds

export enum ChatMessageRole {
  ASSISTANT = "ASSISTANT",
  USER = "USER",
}

// Plain data shape.
export interface ChatMessageData {
  id: string;
  userId: string;
  sessionId: string; // UUID or `${botId}#${chatId}` for Telegram messages
  role: ChatMessageRole;
  content: string;
  createdAt: DateTimeString;
  expiresAt: number; // Unix timestamp (seconds), DynamoDB TTL attribute
}

/**
 * Immutable and TTL-expired: unlike other entities,
 * ChatMessage has no `isArchived` flag and no `update()`/`archive()` methods.
 */
export class ChatMessage implements ChatMessageData {
  private readonly data: Readonly<ChatMessageData>;

  get id() {
    return this.data.id;
  }

  get userId() {
    return this.data.userId;
  }

  get sessionId() {
    return this.data.sessionId;
  }

  get role() {
    return this.data.role;
  }

  get content() {
    return this.data.content;
  }

  get createdAt() {
    return this.data.createdAt;
  }

  get expiresAt() {
    return this.data.expiresAt;
  }

  static create(
    input: CreateChatMessageInput,
    { idGenerator = randomUUID }: { idGenerator?: () => string } = {},
  ): ChatMessage {
    const now = new Date();
    const createdAt = toDateTimeString(now.toISOString());
    const expiresAt = Math.floor(now.getTime() / 1000) + input.ttlSeconds;

    const data: ChatMessageData = {
      id: idGenerator(),
      userId: input.userId,
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
      createdAt,
      expiresAt,
    };

    return new ChatMessage(data);
  }

  static fromPersistence(data: Readonly<ChatMessageData>): ChatMessage {
    return new ChatMessage(data);
  }

  toData(): Readonly<ChatMessageData> {
    return {
      ...this.data,
    };
  }

  private constructor(data: Readonly<ChatMessageData>) {
    this.data = { ...data };
    this.assertInvariants();
  }

  private assertInvariants(): void {
    if (!this.sessionId) {
      throw new ModelError("Chat message session ID is required");
    }

    if (!this.content) {
      throw new ModelError("Chat message content is required");
    }

    const expiresAtMillis = this.expiresAt * 1000;
    if (expiresAtMillis <= new Date(this.createdAt).getTime()) {
      throw new ModelError("Chat message must expire after it is created");
    }
  }
}

export interface CreateChatMessageInput {
  userId: string;
  sessionId: string;
  role: ChatMessageRole;
  content: string;
  ttlSeconds: number;
}
