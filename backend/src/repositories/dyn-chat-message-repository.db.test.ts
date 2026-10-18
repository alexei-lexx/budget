import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { faker } from "@faker-js/faker";
import { monotonicFactory } from "ulidx";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ChatMessage } from "../models/chat-message";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import { requireEnv } from "../utils/require-env";
import { truncateTable } from "../utils/test-utils/dynamodb-helpers";
import { fakeCreateChatMessageInput } from "../utils/test-utils/models/chat-message-fakes";
import { DynChatMessageRepository } from "./dyn-chat-message-repository";

const ulid = monotonicFactory();

describe("DynChatMessageRepository", () => {
  const userId = faker.string.uuid();
  const sessionId = faker.string.uuid();
  const tableName = requireEnv("CHAT_MESSAGES_TABLE_NAME");
  const client = createDynamoDBDocumentClient();

  let repository: DynChatMessageRepository;

  beforeAll(() => {
    repository = new DynChatMessageRepository({
      tableName,
      documentClient: client,
    });
  });

  beforeEach(async () => {
    await truncateTable(client, tableName, {
      partitionKey: "userId",
      sortKey: "sessionSortKey",
    });
  });

  describe("findManyRecentBySessionId", () => {
    // Happy path

    it("returns messages for session in descending order", async () => {
      // Arrange
      const message1 = ChatMessage.create(
        fakeCreateChatMessageInput({ userId, sessionId }),
      );
      await repository.create(message1);
      const message2 = ChatMessage.create(
        fakeCreateChatMessageInput({ userId, sessionId }),
      );
      await repository.create(message2);
      const message3 = ChatMessage.create(
        fakeCreateChatMessageInput({ userId, sessionId }),
      );
      await repository.create(message3);

      // Act
      const messages = await repository.findManyRecentBySessionId(
        { userId, sessionId },
        10,
      );

      // Assert
      expect(messages).toHaveLength(3);
      expect(messages[0]?.id).toBe(message3.id);
      expect(messages[1]?.id).toBe(message2.id);
      expect(messages[2]?.id).toBe(message1.id);
    });

    it("returns empty array when no messages exist for session", async () => {
      // Act
      const messages = await repository.findManyRecentBySessionId(
        { userId, sessionId: faker.string.uuid() },
        10,
      );

      // Assert
      expect(messages).toEqual([]);
    });

    it("limits to N most recent messages", async () => {
      // Arrange — save 5 messages
      for (let i = 0; i < 5; i++) {
        await repository.create(
          ChatMessage.create(
            fakeCreateChatMessageInput({
              userId,
              sessionId,
              content: `Message ${i}`,
            }),
          ),
        );
      }

      // Act — request only 3
      const messages = await repository.findManyRecentBySessionId(
        { userId, sessionId },
        3,
      );

      // Assert — get the 3 most recent, in descending order
      expect(messages).toHaveLength(3);
      expect(messages[0]?.content).toBe("Message 4");
      expect(messages[1]?.content).toBe("Message 3");
      expect(messages[2]?.content).toBe("Message 2");
    });

    it("does not return messages from other sessions", async () => {
      // Arrange
      const otherSessionId = faker.string.uuid();
      await repository.create(
        ChatMessage.create(fakeCreateChatMessageInput({ userId, sessionId })),
      );
      await repository.create(
        ChatMessage.create(
          fakeCreateChatMessageInput({ userId, sessionId: otherSessionId }),
        ),
      );

      // Act
      const messages = await repository.findManyRecentBySessionId(
        { userId, sessionId },
        10,
      );

      // Assert
      expect(messages).toHaveLength(1);
      expect(messages[0]?.sessionId).toBe(sessionId);
    });

    it("does not return messages from other users", async () => {
      // Arrange
      const otherUserId = faker.string.uuid();
      await repository.create(
        ChatMessage.create(fakeCreateChatMessageInput({ userId, sessionId })),
      );
      await repository.create(
        ChatMessage.create(
          fakeCreateChatMessageInput({ userId: otherUserId, sessionId }),
        ),
      );

      // Act
      const messages = await repository.findManyRecentBySessionId(
        { userId, sessionId },
        10,
      );

      // Assert
      expect(messages).toHaveLength(1);
      expect(messages[0]?.userId).toBe(userId);
    });

    it("does not expose internal sessionSortKey attribute", async () => {
      // Arrange
      await repository.create(
        ChatMessage.create(fakeCreateChatMessageInput({ userId, sessionId })),
      );

      // Act
      const [message] = await repository.findManyRecentBySessionId(
        { userId, sessionId },
        1,
      );

      // Assert
      expect(message).not.toHaveProperty("sessionSortKey");
    });

    // Validation failures

    it("throws when userId is missing", async () => {
      // Act & Assert
      await expect(
        repository.findManyRecentBySessionId({ userId: "", sessionId }, 10),
      ).rejects.toThrow("User ID is required");
    });

    it("throws when sessionId is missing", async () => {
      // Act & Assert
      await expect(
        repository.findManyRecentBySessionId({ userId, sessionId: "" }, 10),
      ).rejects.toThrow("Session ID is required");
    });

    it("throws when limit is not positive integer", async () => {
      // Act & Assert
      await expect(
        repository.findManyRecentBySessionId({ userId, sessionId }, 0),
      ).rejects.toThrow("Limit must be a positive integer");

      await expect(
        repository.findManyRecentBySessionId({ userId, sessionId }, -1),
      ).rejects.toThrow("Limit must be a positive integer");

      await expect(
        repository.findManyRecentBySessionId({ userId, sessionId }, 1.5),
      ).rejects.toThrow("Limit must be a positive integer");
    });

    it("throws when required field content is missing from database record", async () => {
      // Arrange — write directly, bypassing entity validation,
      // to simulate a corrupt row already sitting in the table.
      await client.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            id: faker.string.uuid(),
            userId,
            sessionId,
            role: "USER",
            content: null,
            createdAt: new Date().toISOString(),
            expiresAt: Math.floor(Date.now() / 1000) + 3600,
            sessionSortKey: `${sessionId}#${ulid()}`,
          },
        }),
      );

      // Act & Assert
      await expect(
        repository.findManyRecentBySessionId({ userId, sessionId }, 10),
      ).rejects.toThrow("Failed to hydrate chat messages");
    });
  });

  describe("create", () => {
    // Happy path

    it("persists message to database", async () => {
      // Arrange
      const message = ChatMessage.create(
        fakeCreateChatMessageInput({ userId, sessionId }),
      );

      // Act
      await repository.create(message);

      // Assert
      const [found] = await repository.findManyRecentBySessionId(
        { userId, sessionId },
        1,
      );
      expect(found).toEqual(message);
    });
  });
});
