import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { monotonicFactory } from "ulidx";
import { z } from "zod";
import { ChatMessage } from "../models/chat-message";
import { ChatMessageRepository } from "../ports/chat-message-repository";
import { RepositoryError } from "../ports/repository-error";
import { DynBaseRepository } from "./dyn-base-repository";
import { chatMessageDbItemSchema } from "./schemas/chat-message";

const ulid = monotonicFactory();

function toChatMessage(
  dbItem: z.infer<typeof chatMessageDbItemSchema>,
): ChatMessage {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { sessionSortKey, ...data } = dbItem;
  return ChatMessage.fromPersistence(data);
}

export class DynChatMessageRepository
  extends DynBaseRepository
  implements ChatMessageRepository
{
  constructor(options: {
    tableName: string;
    documentClient: DynamoDBDocumentClient;
  }) {
    super(options.tableName, options.documentClient);
  }

  async findManyRecentBySessionId(
    selector: { userId: string; sessionId: string },
    limit: number,
  ): Promise<ChatMessage[]> {
    const { userId, sessionId } = selector;

    if (!userId) {
      throw new RepositoryError("User ID is required");
    }

    if (!sessionId) {
      throw new RepositoryError("Session ID is required");
    }

    if (!Number.isInteger(limit) || limit <= 0) {
      throw new RepositoryError("Limit must be a positive integer");
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
      throw new RepositoryError("Failed to find chat messages", error);
    }

    try {
      return items.map((item) =>
        toChatMessage(this.hydrate(chatMessageDbItemSchema, item)),
      );
    } catch (error) {
      console.error("Error hydrating chat messages:", error);
      throw new RepositoryError("Failed to hydrate chat messages", error);
    }
  }

  async create(message: Readonly<ChatMessage>): Promise<void> {
    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: {
          ...message.toData(),
          sessionSortKey: `${message.sessionId}#${ulid()}`,
        },
      });

      await this.client.send(command);
    } catch (error) {
      console.error("Error creating chat message:", error);
      throw new RepositoryError("Failed to create chat message", error);
    }
  }
}
