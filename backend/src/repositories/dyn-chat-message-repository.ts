import { randomUUID } from "crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { monotonicFactory } from "ulidx";
import { z } from "zod";
import { ChatMessage } from "../models/chat-message";
import {
  ChatMessageRepository,
  CreateChatMessageInput,
} from "../services/ports/chat-message-repository";
import { RepositoryError } from "../services/ports/repository-error";
import { DynBaseRepository } from "./dyn-base-repository";
import { chatMessageDbItemSchema } from "./schemas/chat-message";
import { hydrate } from "./utils/hydrate";

export const DEFAULT_CHAT_MESSAGE_TTL_SECONDS = 24 * 60 * 60; // 24 hours

const ulid = monotonicFactory();

function toChatMessage(
  dbItem: z.infer<typeof chatMessageDbItemSchema>,
): ChatMessage {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { sessionSortKey, ...chatMessage } = dbItem;
  return chatMessage;
}

export class DynChatMessageRepository
  extends DynBaseRepository
  implements ChatMessageRepository
{
  private ttlSeconds: number;

  constructor(
    tableName: string,
    options: {
      dynamoClient?: DynamoDBClient;
      ttlSeconds?: number;
    } = {},
  ) {
    super(tableName, options.dynamoClient);
    this.ttlSeconds = options.ttlSeconds ?? DEFAULT_CHAT_MESSAGE_TTL_SECONDS;
  }

  async findManyRecentBySessionId(
    selector: { userId: string; sessionId: string },
    limit: number,
  ): Promise<ChatMessage[]> {
    const { userId, sessionId } = selector;

    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
    }

    if (!sessionId) {
      throw new RepositoryError("Session ID is required", "INVALID_PARAMETERS");
    }

    if (!Number.isInteger(limit) || limit <= 0) {
      throw new RepositoryError(
        "Limit must be a positive integer",
        "INVALID_PARAMETERS",
      );
    }

    const prefix = `${sessionId}#`;

    let items: Record<string, unknown>[];

    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression:
          "userId = :userId AND begins_with(sessionSortKey, :prefix)",
        ExpressionAttributeValues: {
          ":userId": userId,
          ":prefix": prefix,
        },
        ScanIndexForward: false, // Sort descending
        Limit: limit,
      });

      const result = await this.client.send(command);

      items = result.Items || [];
    } catch (error) {
      console.error("Error finding chat messages:", error);
      throw new RepositoryError(
        "Failed to find chat messages",
        "QUERY_FAILED",
        error,
      );
    }

    try {
      return items.map((item) =>
        toChatMessage(hydrate(chatMessageDbItemSchema, item)),
      );
    } catch (error) {
      console.error("Error hydrating chat messages:", error);
      throw new RepositoryError(
        "Failed to hydrate chat messages",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async create(input: CreateChatMessageInput): Promise<ChatMessage> {
    const { userId, sessionId, role, content } = input;

    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
    }

    if (!sessionId) {
      throw new RepositoryError("Session ID is required", "INVALID_PARAMETERS");
    }

    const now = new Date();

    const chatMessage: ChatMessage = {
      id: randomUUID(),
      userId,
      sessionId,
      role,
      content,
      createdAt: now.toISOString(),
      expiresAt: Math.floor(now.getTime() / 1000) + this.ttlSeconds,
    };

    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: {
          ...chatMessage,
          sessionSortKey: `${sessionId}#${ulid()}`,
        },
      });

      await this.client.send(command);

      return chatMessage;
    } catch (error) {
      console.error("Error creating chat message:", error);
      throw new RepositoryError(
        "Failed to create chat message",
        "CREATE_FAILED",
        error,
      );
    }
  }
}
