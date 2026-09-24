import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it, vi } from "vitest";
import { TelegramBot } from "../models/telegram-bot";
import { BackgroundJobDispatcher } from "../ports/background-job-dispatcher";
import { TelegramApiClient } from "../ports/telegram-api-client";
import { TelegramBotRepository } from "../ports/telegram-bot-repository";
import { fakeConnectedTelegramBot } from "../utils/test-utils/models/telegram-bot-fakes";
import { createMockBackgroundJobDispatcher } from "../utils/test-utils/providers/background-job-dispatcher-mocks";
import { createMockTelegramApiClient } from "../utils/test-utils/providers/telegram-api-client-mocks";
import { createMockTelegramBotRepository } from "../utils/test-utils/repositories/telegram-bot-repository-mocks";
import { BusinessError } from "./business-error";
import { TelegramBotService } from "./telegram-bot-service";

describe("TelegramBotService", () => {
  let backgroundJobDispatcher: Mocked<BackgroundJobDispatcher>;
  let telegramApiClient: Mocked<TelegramApiClient>;
  let telegramBotRepository: Mocked<TelegramBotRepository>;
  let service: TelegramBotService;

  beforeEach(() => {
    backgroundJobDispatcher = createMockBackgroundJobDispatcher();
    telegramApiClient = createMockTelegramApiClient();
    telegramBotRepository = createMockTelegramBotRepository();

    service = new TelegramBotService({
      apiBaseUrl: "http://telegram.localhost",
      backgroundJobDispatcher,
      telegramApiClient,
      telegramBotRepository,
    });

    vi.clearAllMocks();
  });

  describe("findOneConnectedByUserId", () => {
    // Happy path

    it("returns null when no bot is connected", async () => {
      // Arrange
      const userId = faker.string.uuid();
      // No connected bot for user
      telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(null);

      // Act
      const result = await service.findOneConnectedByUserId(userId);

      // Assert
      expect(result).toBeNull();
    });

    it("returns masked bot when connected", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const bot = fakeConnectedTelegramBot({ userId, token: "1234567890" });
      // Connected bot exists for user
      telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);

      // Act
      const result = await service.findOneConnectedByUserId(userId);

      // Assert
      expect(result).toEqual({
        id: bot.id,
        maskedToken: "••••7890",
      });
    });
  });

  describe("test", () => {
    // Happy path

    it("returns success when webhook is registered", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const bot = fakeConnectedTelegramBot({ userId });
      // Connected bot exists for user
      telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
      // Webhook registered at expected URL
      telegramApiClient.getWebhookInfo.mockResolvedValue({
        success: true,
        data: { url: "http://telegram.localhost/webhooks/telegram" },
      });

      // Act
      const result = await service.test(userId);

      // Assert
      expect(result).toBe(true);
    });

    // Validation failures

    it("fails when webhook URL does not match", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const bot = fakeConnectedTelegramBot({ userId });
      telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
      // Webhook registered at unexpected URL
      telegramApiClient.getWebhookInfo.mockResolvedValue({
        success: true,
        data: { url: "http://telegram.localhost/telegram/unexpected-webhook" },
      });

      // Act & Assert
      await expect(service.test(userId)).rejects.toThrow(
        new BusinessError("Bot webhook is not registered"),
      );
    });

    it("fails when no connected bot found", async () => {
      // Arrange
      const userId = faker.string.uuid();
      // No connected bot for user
      telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(null);

      // Act & Assert
      await expect(service.test(userId)).rejects.toThrow(
        new BusinessError("No connected bot found"),
      );
    });

    // Dependency failures

    it("fails when getWebhookInfo fails", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const bot = fakeConnectedTelegramBot({ userId });
      telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
      // Telegram API unreachable
      telegramApiClient.getWebhookInfo.mockResolvedValue({
        success: false,
        error: "Some error",
      });

      // Act & Assert
      await expect(service.test(userId)).rejects.toThrow(
        new BusinessError(
          "Failed to reach Telegram. Check the bot is still active.",
        ),
      );
    });
  });

  describe("connect", () => {
    // Happy path

    it("creates PENDING record, calls setWebhook, and returns CONNECTED bot", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const token = "1234567890";
      // Persists new PENDING record
      telegramBotRepository.create.mockResolvedValue(undefined);
      // Telegram accepts webhook registration
      telegramApiClient.setWebhook.mockResolvedValue({
        success: true,
        data: undefined,
      });
      // Echoes back whatever bot state is passed in
      telegramBotRepository.update.mockImplementation((bot) =>
        Promise.resolve(TelegramBot.fromPersistence(bot.toData())),
      );

      // Act
      const result = await service.connect(userId, token);

      // Assert
      expect(result).toEqual({
        id: expect.any(String),
        maskedToken: "••••7890",
      });
      expect(telegramBotRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          token,
          status: "PENDING",
        }),
      );
      expect(telegramApiClient.setWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          secretToken: expect.any(String),
          token,
          url: "http://telegram.localhost/webhooks/telegram",
        }),
      );
      expect(telegramBotRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "CONNECTED" }),
      );
    });

    // Validation failures

    it("fails when bot is already connected", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const existingBot = fakeConnectedTelegramBot({ userId });
      // Connected bot already exists for user
      telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(
        existingBot,
      );

      // Act & Assert
      await expect(service.connect(userId, "new-token")).rejects.toThrow(
        new BusinessError("A bot is already connected. Disconnect it first."),
      );
      expect(telegramBotRepository.create).not.toHaveBeenCalled();
    });

    it("fails when userId is empty", async () => {
      // Act & Assert
      await expect(service.connect("", "some-token")).rejects.toThrow(
        new BusinessError("User ID is required"),
      );
    });

    it("fails when token is empty", async () => {
      // Arrange
      const userId = faker.string.uuid();

      // Act & Assert
      await expect(service.connect(userId, "")).rejects.toThrow(
        new BusinessError("Bot token is required"),
      );
    });

    // Dependency failures

    it("archives pending record and fails when setWebhook fails", async () => {
      // Arrange
      const userId = faker.string.uuid();
      telegramBotRepository.create.mockResolvedValue(undefined);
      // Telegram rejects webhook registration
      telegramApiClient.setWebhook.mockResolvedValue({
        success: false,
        error: "Some error",
      });
      // Echoes back whatever bot state is passed in
      telegramBotRepository.update.mockImplementation((bot) =>
        Promise.resolve(TelegramBot.fromPersistence(bot.toData())),
      );

      // Act & Assert
      await expect(service.connect(userId, "bad-token")).rejects.toThrow(
        new BusinessError(
          "Failed to connect Telegram bot. Check the token and try again.",
        ),
      );
      expect(telegramBotRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ isArchived: true }),
      );
    });
  });

  describe("disconnect", () => {
    // Happy path

    it("marks as DELETING, deletes webhook, and archives bot", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const bot = fakeConnectedTelegramBot({ userId });
      // Connected bot exists for user
      telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
      // Echoes back whatever bot state is passed in
      telegramBotRepository.update.mockImplementation((updated) =>
        Promise.resolve(TelegramBot.fromPersistence(updated.toData())),
      );
      // Telegram accepts webhook deletion
      telegramApiClient.deleteWebhook.mockResolvedValue({
        success: true,
        data: undefined,
      });

      // Act
      const result = await service.disconnect(userId);

      // Assert
      expect(result).toBeUndefined();
      expect(telegramBotRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "DELETING" }),
      );
      expect(telegramApiClient.deleteWebhook).toHaveBeenCalledWith(bot.token);
      expect(telegramBotRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ isArchived: true }),
      );
    });

    // Validation failures

    it("fails when no connected bot found", async () => {
      // Arrange
      const userId = faker.string.uuid();
      // No connected bot for user
      telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(null);

      // Act & Assert
      await expect(service.disconnect(userId)).rejects.toThrow(
        new BusinessError("No connected bot found"),
      );
    });

    // Dependency failures

    it("still archives when deleteWebhook fails", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const bot = fakeConnectedTelegramBot({ userId });
      telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
      telegramBotRepository.update.mockImplementation((updated) =>
        Promise.resolve(TelegramBot.fromPersistence(updated.toData())),
      );
      // Telegram rejects webhook deletion
      telegramApiClient.deleteWebhook.mockResolvedValue({
        success: false,
        error: "Some error",
      });

      // Act
      const result = await service.disconnect(userId);

      // Assert
      expect(result).toBeUndefined();
      expect(telegramBotRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ isArchived: true }),
      );
    });
  });

  describe("acceptMessage", () => {
    // Happy path

    it("dispatches background job", async () => {
      // Arrange
      const webhookSecret = faker.string.uuid();
      const bot = fakeConnectedTelegramBot();
      // Connected bot matches webhook secret
      telegramBotRepository.findOneConnectedByWebhookSecret.mockResolvedValue(
        bot,
      );
      backgroundJobDispatcher.dispatch.mockResolvedValue(undefined);

      // Act
      const result = await service.acceptMessage(webhookSecret, {
        chatId: 12345,
        text: "Hello",
      });

      // Assert
      expect(result).toBeUndefined();
      expect(backgroundJobDispatcher.dispatch).toHaveBeenCalledWith({
        type: "telegram-message",
        payload: {
          botId: bot.id,
          chatId: 12345,
          text: "Hello",
          userId: bot.userId,
        },
      });
    });

    it("silently succeeds when bot is unknown", async () => {
      // Arrange
      // No bot matches webhook secret
      telegramBotRepository.findOneConnectedByWebhookSecret.mockResolvedValue(
        null,
      );

      // Act
      const result = await service.acceptMessage("unknown-secret", {
        chatId: 123456,
        text: "Hello?",
      });

      // Assert
      expect(result).toBeUndefined();
      expect(backgroundJobDispatcher.dispatch).not.toHaveBeenCalled();
    });
  });
});
