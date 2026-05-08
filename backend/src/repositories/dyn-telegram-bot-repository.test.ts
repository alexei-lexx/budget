import { faker } from "@faker-js/faker";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TelegramBotStatus } from "../models/telegram-bot";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import { requireEnv } from "../utils/require-env";
import { truncateTable } from "../utils/test-utils/dynamodb-helpers";
import { fakeCreateTelegramBotInput } from "../utils/test-utils/repositories/telegram-bot-repository-fakes";
import { DynTelegramBotRepository } from "./dyn-telegram-bot-repository";

describe("DynTelegramBotRepository", () => {
  let repository: DynTelegramBotRepository;
  const userId = faker.string.uuid();
  const tableName = requireEnv("TELEGRAM_BOTS_TABLE_NAME");
  const client = createDynamoDBDocumentClient();

  beforeAll(async () => {
    repository = new DynTelegramBotRepository(tableName, client);
  });

  beforeEach(async () => {
    await truncateTable(client, tableName, {
      partitionKey: "userId",
      sortKey: "id",
    });
  });

  describe("findOneConnectedByUserId", () => {
    // Happy path

    it("returns null when no connected bot exists", async () => {
      // Act
      const result = await repository.findOneConnectedByUserId(
        faker.string.uuid(),
      );

      // Assert
      expect(result).toBeNull();
    });

    it("returns connected bot", async () => {
      // Arrange
      const created = await repository.create(
        fakeCreateTelegramBotInput({
          userId,
          status: TelegramBotStatus.CONNECTED,
        }),
      );

      // Act
      const result = await repository.findOneConnectedByUserId(userId);

      // Assert
      expect(result).toEqual(created);
    });

    it("does not return archived bot", async () => {
      // Arrange
      const created = await repository.create(
        fakeCreateTelegramBotInput({
          userId,
          status: TelegramBotStatus.CONNECTED,
        }),
      );
      await repository.archive({ id: created.id, userId });

      // Act
      const result = await repository.findOneConnectedByUserId(userId);

      // Assert
      expect(result).toBeNull();
    });

    it("does not return PENDING bot", async () => {
      // Arrange
      await repository.create(
        fakeCreateTelegramBotInput({
          userId,
          status: TelegramBotStatus.PENDING,
        }),
      );

      // Act
      const result = await repository.findOneConnectedByUserId(userId);

      // Assert
      expect(result).toBeNull();
    });

    it("does not return DELETING bot", async () => {
      // Arrange
      await repository.create(
        fakeCreateTelegramBotInput({
          userId,
          status: TelegramBotStatus.DELETING,
        }),
      );

      // Act
      const result = await repository.findOneConnectedByUserId(userId);

      // Assert
      expect(result).toBeNull();
    });

    // Validation failures

    it("throws when multiple connected bots exist", async () => {
      // Arrange
      await repository.create(
        fakeCreateTelegramBotInput({
          userId,
          status: TelegramBotStatus.CONNECTED,
        }),
      );
      await repository.create(
        fakeCreateTelegramBotInput({
          userId,
          status: TelegramBotStatus.CONNECTED,
        }),
      );

      // Act & Assert
      await expect(
        repository.findOneConnectedByUserId(userId),
      ).rejects.toMatchObject({
        code: "INTEGRITY_ERROR",
        message: "Multiple connected bots found for user",
      });
    });
  });

  describe("findOneConnectedByWebhookSecret", () => {
    // Happy path

    it("returns null when no bot matches secret", async () => {
      // Act
      const result = await repository.findOneConnectedByWebhookSecret(
        faker.string.uuid(),
      );

      // Assert
      expect(result).toBeNull();
    });

    it("returns connected bot by webhook secret", async () => {
      // Arrange
      const webhookSecret = faker.string.uuid();
      const created = await repository.create(
        fakeCreateTelegramBotInput({
          userId,
          webhookSecret,
          status: TelegramBotStatus.CONNECTED,
        }),
      );

      // Act
      const result =
        await repository.findOneConnectedByWebhookSecret(webhookSecret);

      // Assert
      expect(result).toEqual(created);
    });

    it("does not return archived bot", async () => {
      // Arrange
      const webhookSecret = faker.string.uuid();
      const created = await repository.create(
        fakeCreateTelegramBotInput({
          userId,
          webhookSecret,
          status: TelegramBotStatus.CONNECTED,
        }),
      );
      await repository.archive({ id: created.id, userId });

      // Act
      const result =
        await repository.findOneConnectedByWebhookSecret(webhookSecret);

      // Assert
      expect(result).toBeNull();
    });

    it("does not return PENDING bot", async () => {
      // Arrange
      const webhookSecret = faker.string.uuid();
      await repository.create(
        fakeCreateTelegramBotInput({
          userId,
          webhookSecret,
          status: TelegramBotStatus.PENDING,
        }),
      );

      // Act
      const result =
        await repository.findOneConnectedByWebhookSecret(webhookSecret);

      // Assert
      expect(result).toBeNull();
    });

    it("does not return DELETING bot", async () => {
      // Arrange
      const webhookSecret = faker.string.uuid();
      await repository.create(
        fakeCreateTelegramBotInput({
          userId,
          webhookSecret,
          status: TelegramBotStatus.DELETING,
        }),
      );

      // Act
      const result =
        await repository.findOneConnectedByWebhookSecret(webhookSecret);

      // Assert
      expect(result).toBeNull();
    });

    // Validation failures

    it("throws when multiple connected bots share same webhook secret", async () => {
      // Arrange
      const webhookSecret = faker.string.uuid();
      await repository.create(
        fakeCreateTelegramBotInput({
          userId,
          webhookSecret,
          status: TelegramBotStatus.CONNECTED,
        }),
      );
      await repository.create(
        fakeCreateTelegramBotInput({
          userId,
          webhookSecret,
          status: TelegramBotStatus.CONNECTED,
        }),
      );

      // Act & Assert
      await expect(
        repository.findOneConnectedByWebhookSecret(webhookSecret),
      ).rejects.toMatchObject({
        code: "INTEGRITY_ERROR",
        message: "Multiple connected bots found for webhook secret",
      });
    });
  });

  describe("create", () => {
    // Happy path

    it("creates telegram bot record", async () => {
      // Arrange
      const input = fakeCreateTelegramBotInput({ userId });

      // Act
      const bot = await repository.create(input);

      // Assert
      expect(bot.id).toBeDefined();
      expect(bot.userId).toBe(userId);
      expect(bot.token).toBe(input.token);
      expect(bot.webhookSecret).toBe(input.webhookSecret);
      expect(bot.status).toBe(input.status);
      expect(bot.isArchived).toBe(false);
      expect(bot.createdAt).toBeDefined();
      expect(bot.updatedAt).toBeDefined();
    });
  });

  describe("update", () => {
    // Happy path

    it("updates status of bot", async () => {
      // Arrange
      const created = await repository.create(
        fakeCreateTelegramBotInput({
          userId,
          status: TelegramBotStatus.PENDING,
        }),
      );

      // Act
      const updated = await repository.update(
        { id: created.id, userId },
        { status: TelegramBotStatus.CONNECTED },
      );

      // Assert
      expect(updated.status).toBe(TelegramBotStatus.CONNECTED);
      expect(updated.id).toBe(created.id);
    });
  });

  describe("archive", () => {
    // Happy path

    it("sets isArchived to true and returns archived bot", async () => {
      // Arrange
      const created = await repository.create(
        fakeCreateTelegramBotInput({ userId }),
      );

      // Act
      const archived = await repository.archive({ id: created.id, userId });

      // Assert
      expect(archived.id).toBe(created.id);
      expect(archived.isArchived).toBe(true);
    });
  });
});
