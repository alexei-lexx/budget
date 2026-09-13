import { faker } from "@faker-js/faker";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TelegramBot, TelegramBotStatus } from "../models/telegram-bot";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import { requireEnv } from "../utils/require-env";
import { truncateTable } from "../utils/test-utils/dynamodb-helpers";
import {
  fakeCreateTelegramBotInput,
  fakeDeletingTelegramBot,
  fakePendingTelegramBot,
} from "../utils/test-utils/models/telegram-bot-fakes";
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
      const pending = TelegramBot.create(
        fakeCreateTelegramBotInput({ userId }),
      );
      await repository.create(pending);
      const connected = await repository.update(pending.connect());

      // Act
      const result = await repository.findOneConnectedByUserId(userId);

      // Assert
      expect(result).toEqual(connected);
    });

    it("does not return archived bot", async () => {
      // Arrange
      const pending = TelegramBot.create(
        fakeCreateTelegramBotInput({ userId }),
      );
      await repository.create(pending);
      const connected = await repository.update(pending.connect());
      await repository.update(connected.archive());

      // Act
      const result = await repository.findOneConnectedByUserId(userId);

      // Assert
      expect(result).toBeNull();
    });

    it("does not return PENDING bot", async () => {
      // Arrange
      const pending = fakePendingTelegramBot({ userId });
      await repository.create(pending);

      // Act
      const result = await repository.findOneConnectedByUserId(userId);

      // Assert
      expect(result).toBeNull();
    });

    it("does not return DELETING bot", async () => {
      // Arrange
      const bot = fakeDeletingTelegramBot({ userId });
      await repository.create(bot);

      // Act
      const result = await repository.findOneConnectedByUserId(userId);

      // Assert
      expect(result).toBeNull();
    });

    // Validation failures

    it("throws when multiple connected bots exist", async () => {
      // Arrange
      const first = TelegramBot.create(fakeCreateTelegramBotInput({ userId }));
      await repository.create(first);
      await repository.update(first.connect());

      const second = TelegramBot.create(fakeCreateTelegramBotInput({ userId }));
      await repository.create(second);
      await repository.update(second.connect());

      // Act & Assert
      await expect(
        repository.findOneConnectedByUserId(userId),
      ).rejects.toMatchObject({
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
      const pending = TelegramBot.create(
        fakeCreateTelegramBotInput({ userId }),
      );
      await repository.create(pending);
      const connected = await repository.update(pending.connect());

      // Act
      const result = await repository.findOneConnectedByWebhookSecret(
        connected.webhookSecret,
      );

      // Assert
      expect(result).toEqual(connected);
    });

    it("does not return archived bot", async () => {
      // Arrange
      const pending = TelegramBot.create(
        fakeCreateTelegramBotInput({ userId }),
      );
      await repository.create(pending);
      const connected = await repository.update(pending.connect());
      await repository.update(connected.archive());

      // Act
      const result = await repository.findOneConnectedByWebhookSecret(
        connected.webhookSecret,
      );

      // Assert
      expect(result).toBeNull();
    });

    it("does not return PENDING bot", async () => {
      // Arrange
      const pending = fakePendingTelegramBot({ userId });
      await repository.create(pending);

      // Act
      const result = await repository.findOneConnectedByWebhookSecret(
        pending.webhookSecret,
      );

      // Assert
      expect(result).toBeNull();
    });

    it("does not return DELETING bot", async () => {
      // Arrange
      const bot = fakeDeletingTelegramBot({ userId });
      await repository.create(bot);

      // Act
      const result = await repository.findOneConnectedByWebhookSecret(
        bot.webhookSecret,
      );

      // Assert
      expect(result).toBeNull();
    });

    // Validation failures

    it("throws when multiple connected bots share same webhook secret", async () => {
      // Arrange — webhookSecret is generated per bot,
      // so force a collision by hydrating a second bot with the first bot's secret.
      const first = TelegramBot.create(fakeCreateTelegramBotInput({ userId }));
      await repository.create(first);
      const connectedFirst = await repository.update(first.connect());

      const secondPending = TelegramBot.create(
        fakeCreateTelegramBotInput({ userId }),
      );
      const secondWithSameSecret = TelegramBot.fromPersistence({
        ...secondPending.toData(),
        webhookSecret: connectedFirst.webhookSecret,
      });
      await repository.create(secondWithSameSecret);
      await repository.update(secondWithSameSecret.connect());

      // Act & Assert
      await expect(
        repository.findOneConnectedByWebhookSecret(
          connectedFirst.webhookSecret,
        ),
      ).rejects.toMatchObject({
        message: "Multiple connected bots found for webhook secret",
      });
    });
  });

  describe("create", () => {
    // Happy path

    it("creates telegram bot record", async () => {
      // Arrange
      const bot = TelegramBot.create(fakeCreateTelegramBotInput({ userId }));

      // Act
      await repository.create(bot);

      // Assert
      const found = await repository.findOneConnectedByWebhookSecret(
        bot.webhookSecret,
      );
      expect(found).toBeNull(); // still PENDING, not CONNECTED

      const stored = await repository.update(bot.connect());
      expect(stored.id).toBe(bot.id);
      expect(stored.userId).toBe(userId);
      expect(stored.token).toBe(bot.token);
      expect(stored.webhookSecret).toBe(bot.webhookSecret);
      expect(stored.isArchived).toBe(false);
    });
  });

  describe("update", () => {
    // Happy path

    it("persists mutated fields", async () => {
      // Arrange
      const created = TelegramBot.create(
        fakeCreateTelegramBotInput({ userId }),
      );
      await repository.create(created);

      // Act
      const updated = await repository.update(created.connect());

      // Assert
      expect(updated.id).toBe(created.id);
      expect(updated.status).toBe(TelegramBotStatus.CONNECTED);
    });

    // Validation failures

    it("throws when bot does not exist", async () => {
      // Arrange
      const bot = TelegramBot.create(fakeCreateTelegramBotInput({ userId }));

      // Act & Assert
      await expect(repository.update(bot.connect())).rejects.toMatchObject({
        message: "Telegram bot not found or is archived",
      });
    });

    it("throws when bot is already archived", async () => {
      // Arrange
      const created = TelegramBot.create(
        fakeCreateTelegramBotInput({ userId }),
      );
      await repository.create(created);
      const connected = await repository.update(created.connect());
      await repository.update(connected.archive());

      // Act & Assert — a stale in-memory copy still thinks it's CONNECTED
      await expect(
        repository.update(connected.disconnect()),
      ).rejects.toMatchObject({
        message: "Telegram bot not found or is archived",
      });
    });
  });
});
