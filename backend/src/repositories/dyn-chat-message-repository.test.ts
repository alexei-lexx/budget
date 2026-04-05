import { faker } from "@faker-js/faker";
import { beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import { requireEnv } from "../utils/require-env";
import { truncateTable } from "../utils/test-utils/dynamodb-helpers";
import { fakeCreateChatMessageInput } from "../utils/test-utils/repositories/chat-message-repository-fakes";
import { DynChatMessageRepository } from "./dyn-chat-message-repository";

describe("DynChatMessageRepository", () => {
  const userId = faker.string.uuid();
  const sessionId = faker.string.uuid();

  let repository: DynChatMessageRepository;

  beforeAll(() => {
    repository = new DynChatMessageRepository(
      requireEnv("CHAT_MESSAGES_TABLE_NAME"),
      {
        ttlSeconds: 3600, // 1 hour
      },
    );
  });

  beforeEach(async () => {
    const client = createDynamoDBDocumentClient();
    const tableName = requireEnv("CHAT_MESSAGES_TABLE_NAME");

    await truncateTable(client, tableName, {
      partitionKey: "userId",
      sortKey: "sessionSortKey",
    });
  });

  describe("findManyRecentBySessionId", () => {
    it("should return messages for a session in descending order", async () => {
      // Arrange
      const message1 = await repository.create(
        fakeCreateChatMessageInput({ userId, sessionId }),
      );
      const message2 = await repository.create(
        fakeCreateChatMessageInput({ userId, sessionId }),
      );
      const message3 = await repository.create(
        fakeCreateChatMessageInput({ userId, sessionId }),
      );

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

    it("should return empty array when no messages exist for session", async () => {
      const messages = await repository.findManyRecentBySessionId(
        { userId, sessionId: faker.string.uuid() },
        10,
      );

      expect(messages).toEqual([]);
    });

    it("should limit to N most recent messages", async () => {
      // Arrange — save 5 messages
      for (let i = 0; i < 5; i++) {
        await repository.create(
          fakeCreateChatMessageInput({
            userId,
            sessionId,
            content: `Message ${i}`,
          }),
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

    it("should not return messages from other sessions", async () => {
      // Arrange
      const otherSessionId = faker.string.uuid();
      await repository.create(
        fakeCreateChatMessageInput({ userId, sessionId }),
      );
      await repository.create(
        fakeCreateChatMessageInput({ userId, sessionId: otherSessionId }),
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

    it("should not return messages from other users", async () => {
      // Arrange
      const otherUserId = faker.string.uuid();
      await repository.create(
        fakeCreateChatMessageInput({ userId, sessionId }),
      );
      await repository.create(
        fakeCreateChatMessageInput({ userId: otherUserId, sessionId }),
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

    it("should not expose the internal sessionSortKey attribute", async () => {
      await repository.create(
        fakeCreateChatMessageInput({ userId, sessionId }),
      );

      const [message] = await repository.findManyRecentBySessionId(
        { userId, sessionId },
        1,
      );

      expect(message).not.toHaveProperty("sessionSortKey");
    });

    it("should throw when userId is missing", async () => {
      await expect(
        repository.findManyRecentBySessionId({ userId: "", sessionId }, 10),
      ).rejects.toThrow("User ID is required");
    });

    it("should throw when sessionId is missing", async () => {
      await expect(
        repository.findManyRecentBySessionId({ userId, sessionId: "" }, 10),
      ).rejects.toThrow("Session ID is required");
    });

    it("should throw when limit is not a positive integer", async () => {
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

    describe("hydration - data corruption detection", () => {
      it("should throw when required field content is missing from database record", async () => {
        // Arrange
        await repository.create({
          ...fakeCreateChatMessageInput({ userId, sessionId }),
          content: null as unknown as string, // Force content to be null to simulate corruption
        });

        // Act & Assert
        await expect(
          repository.findManyRecentBySessionId({ userId, sessionId }, 10),
        ).rejects.toThrow();
      });
    });
  });

  describe("create", () => {
    it("should create a message and return it", async () => {
      // Arrange
      const input = fakeCreateChatMessageInput({
        userId,
        sessionId,
      });

      // Act
      const message = await repository.create(input);

      // Assert
      expect(message.id).toBeDefined();
      expect(message.userId).toBe(userId);
      expect(message.sessionId).toBe(sessionId);
      expect(message.role).toBe(input.role);
      expect(message.content).toBe(input.content);
      expect(message.createdAt).toBeDefined();
      expect(message.expiresAt).toBe(
        Math.floor(new Date(message.createdAt).getTime() / 1000) + 3600,
      );
    });

    it("should throw when userId is missing", async () => {
      await expect(
        repository.create(
          fakeCreateChatMessageInput({ userId: "", sessionId }),
        ),
      ).rejects.toThrow("User ID is required");
    });

    it("should throw when sessionId is missing", async () => {
      await expect(
        repository.create(
          fakeCreateChatMessageInput({ userId, sessionId: "" }),
        ),
      ).rejects.toThrow("Session ID is required");
    });

    it("should persist the message to the database", async () => {
      const created = await repository.create(
        fakeCreateChatMessageInput({ userId, sessionId }),
      );

      const [found] = await repository.findManyRecentBySessionId(
        { userId, sessionId },
        1,
      );

      expect(found).toEqual(created);
    });
  });
});
