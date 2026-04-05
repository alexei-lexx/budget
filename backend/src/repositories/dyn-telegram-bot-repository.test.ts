import { faker } from "@faker-js/faker";
import { beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { TelegramBotStatus } from "../models/telegram-bot";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import { requireEnv } from "../utils/require-env";
import { truncateTable } from "../utils/test-utils/dynamodb-helpers";
import { fakeCreateTelegramBotInput } from "../utils/test-utils/repositories/telegram-bot-repository";
import { DynTelegramBotRepository } from "./dyn-telegram-bot-repository";

describe("DynTelegramBotRepository", () => {
  let repository: DynTelegramBotRepository;
  const userId = faker.string.uuid();
  const tableName = requireEnv("TELEGRAM_BOTS_TABLE_NAME");

  beforeAll(async () => {
    repository = new DynTelegramBotRepository(tableName);
  });

  beforeEach(async () => {
    const client = createDynamoDBDocumentClient();
    await truncateTable(client, tableName, {
      partitionKey: "userId",
      sortKey: "id",
    });
  });

  describe("findOneConnectedByUserId", () => {
    it("should return null when no connected bot exists", async () => {
      const result = await repository.findOneConnectedByUserId(
        faker.string.uuid(),
      );

      expect(result).toBeNull();
    });

    it("should return connected bot", async () => {
      const created = await repository.create(
        fakeCreateTelegramBotInput({
          userId,
          status: TelegramBotStatus.CONNECTED,
        }),
      );

      const result = await repository.findOneConnectedByUserId(userId);

      expect(result).toEqual(created);
    });

    it("should not return archived bot", async () => {
      const created = await repository.create(
        fakeCreateTelegramBotInput({
          userId,
          status: TelegramBotStatus.CONNECTED,
        }),
      );
      await repository.archive({ id: created.id, userId });

      const result = await repository.findOneConnectedByUserId(userId);

      expect(result).toBeNull();
    });

    it("should not return PENDING bot", async () => {
      await repository.create(
        fakeCreateTelegramBotInput({
          userId,
          status: TelegramBotStatus.PENDING,
        }),
      );

      const result = await repository.findOneConnectedByUserId(userId);

      expect(result).toBeNull();
    });

    it("should not return DELETING bot", async () => {
      await repository.create(
        fakeCreateTelegramBotInput({
          userId,
          status: TelegramBotStatus.DELETING,
        }),
      );

      const result = await repository.findOneConnectedByUserId(userId);

      expect(result).toBeNull();
    });

    it("should throw when multiple connected bots exist", async () => {
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

      await expect(
        repository.findOneConnectedByUserId(userId),
      ).rejects.toMatchObject({
        code: "INTEGRITY_ERROR",
        message: "Multiple connected bots found for user",
      });
    });
  });

  describe("findOneConnectedByWebhookSecret", () => {
    it("should return null when no bot matches the secret", async () => {
      const result = await repository.findOneConnectedByWebhookSecret(
        faker.string.uuid(),
      );

      expect(result).toBeNull();
    });

    it("should return connected bot by webhook secret", async () => {
      const webhookSecret = faker.string.uuid();
      const created = await repository.create(
        fakeCreateTelegramBotInput({
          userId,
          webhookSecret,
          status: TelegramBotStatus.CONNECTED,
        }),
      );

      const result =
        await repository.findOneConnectedByWebhookSecret(webhookSecret);

      expect(result).toEqual(created);
    });

    it("should not return archived bot", async () => {
      const webhookSecret = faker.string.uuid();
      const created = await repository.create(
        fakeCreateTelegramBotInput({
          userId,
          webhookSecret,
          status: TelegramBotStatus.CONNECTED,
        }),
      );
      await repository.archive({ id: created.id, userId });

      const result =
        await repository.findOneConnectedByWebhookSecret(webhookSecret);

      expect(result).toBeNull();
    });

    it("should not return PENDING bot", async () => {
      const webhookSecret = faker.string.uuid();
      await repository.create(
        fakeCreateTelegramBotInput({
          userId,
          webhookSecret,
          status: TelegramBotStatus.PENDING,
        }),
      );

      const result =
        await repository.findOneConnectedByWebhookSecret(webhookSecret);

      expect(result).toBeNull();
    });

    it("should not return DELETING bot", async () => {
      const webhookSecret = faker.string.uuid();
      await repository.create(
        fakeCreateTelegramBotInput({
          userId,
          webhookSecret,
          status: TelegramBotStatus.DELETING,
        }),
      );

      const result =
        await repository.findOneConnectedByWebhookSecret(webhookSecret);

      expect(result).toBeNull();
    });

    it("should throw when multiple connected bots share the same webhook secret", async () => {
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

      await expect(
        repository.findOneConnectedByWebhookSecret(webhookSecret),
      ).rejects.toMatchObject({
        code: "INTEGRITY_ERROR",
        message: "Multiple connected bots found for webhook secret",
      });
    });
  });

  describe("create", () => {
    it("should create a telegram bot record", async () => {
      const input = fakeCreateTelegramBotInput({ userId });

      const bot = await repository.create(input);

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
    it("should update the status of a bot", async () => {
      const created = await repository.create(
        fakeCreateTelegramBotInput({
          userId,
          status: TelegramBotStatus.PENDING,
        }),
      );

      const updated = await repository.update(
        { id: created.id, userId },
        { status: TelegramBotStatus.CONNECTED },
      );

      expect(updated.status).toBe(TelegramBotStatus.CONNECTED);
      expect(updated.id).toBe(created.id);
    });
  });

  describe("archive", () => {
    it("should set isArchived to true and return the archived bot", async () => {
      const created = await repository.create(
        fakeCreateTelegramBotInput({ userId }),
      );

      const archived = await repository.archive({ id: created.id, userId });

      expect(archived.id).toBe(created.id);
      expect(archived.isArchived).toBe(true);
    });
  });
});
