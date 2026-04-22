import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { TelegramBotStatus } from "../models/telegram-bot";
import { BackgroundJobDispatcher } from "../ports/background-job-dispatcher";
import { TelegramApiClient } from "../ports/telegram-api-client";
import { TelegramBotRepository } from "../ports/telegram-bot-repository";
import { fakeTelegramBot } from "../utils/test-utils/models/telegram-bot-fakes";
import { createMockBackgroundJobDispatcher } from "../utils/test-utils/providers/background-job-dispatcher-mocks";
import { createMockTelegramApiClient } from "../utils/test-utils/providers/telegram-api-client-mocks";
import { createMockTelegramBotRepository } from "../utils/test-utils/repositories/telegram-bot-repository-mocks";
import { TelegramBotService } from "./telegram-bot-service";

describe("TelegramBotService", () => {
  let backgroundJobDispatcher: jest.Mocked<BackgroundJobDispatcher>;
  let telegramApiClient: jest.Mocked<TelegramApiClient>;
  let telegramBotRepository: jest.Mocked<TelegramBotRepository>;
  let service: TelegramBotService;

  beforeEach(() => {
    backgroundJobDispatcher = createMockBackgroundJobDispatcher();
    telegramApiClient = createMockTelegramApiClient();
    telegramBotRepository = createMockTelegramBotRepository();

    service = new TelegramBotService({
      backgroundJobDispatcher,
      telegramApiClient,
      telegramBotRepository,
      webhookBaseUrl: "http://telegram.localhost",
    });

    jest.clearAllMocks();
  });

  describe("connect", () => {
    it("creates PENDING record, calls setWebhook, and returns CONNECTED bot", async () => {
      const userId = faker.string.uuid();
      const token = "1234567890";
      const pendingBot = fakeTelegramBot({ token });
      const connectedBot = fakeTelegramBot(pendingBot);

      telegramBotRepository.create.mockResolvedValue(pendingBot);
      telegramApiClient.setWebhook.mockResolvedValue({
        success: true,
        data: undefined,
      });
      telegramBotRepository.update.mockResolvedValue(connectedBot);

      const result = await service.connect(userId, token);

      expect(result).toEqual({
        success: true,
        data: { id: connectedBot.id, maskedToken: "••••7890" },
      });
      expect(telegramBotRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          token,
          status: TelegramBotStatus.PENDING,
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
        { id: pendingBot.id, userId },
        { status: TelegramBotStatus.CONNECTED },
      );
    });

    it("archives pending record and returns failure when setWebhook fails", async () => {
      const userId = faker.string.uuid();
      const pendingBot = fakeTelegramBot();

      telegramBotRepository.create.mockResolvedValue(pendingBot);
      telegramApiClient.setWebhook.mockResolvedValue({
        success: false,
        error: "Some error",
      });
      telegramBotRepository.archive.mockResolvedValue(pendingBot);

      const result = await service.connect(userId, "bad-token");

      expect(result).toEqual({
        success: false,
        error: "Failed to connect Telegram bot. Check the token and try again.",
      });
      expect(telegramBotRepository.update).not.toHaveBeenCalled();
      expect(telegramBotRepository.archive).toHaveBeenCalledWith({
        id: pendingBot.id,
        userId,
      });
    });

    it("returns failure when there is already a connected bot", async () => {
      const userId = faker.string.uuid();
      const existingBot = fakeTelegramBot();
      telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(
        existingBot,
      );

      const result = await service.connect(userId, "new-token");

      expect(result).toEqual({
        success: false,
        error: "A bot is already connected. Disconnect it first.",
      });
      expect(telegramBotRepository.create).not.toHaveBeenCalled();
    });

    it("returns failure when userId is empty", async () => {
      const result = await service.connect("", "some-token");

      expect(result).toEqual({
        success: false,
        error: "User ID is required",
      });
    });

    it("returns failure when token is empty", async () => {
      const userId = faker.string.uuid();
      const result = await service.connect(userId, "");

      expect(result).toEqual({
        success: false,
        error: "Bot token is required",
      });
    });
  });

  describe("disconnect", () => {
    it("marks as DELETING, deletes webhook, and archives bot", async () => {
      const userId = faker.string.uuid();
      const bot = fakeTelegramBot();

      telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
      telegramBotRepository.update.mockResolvedValue(bot);
      telegramApiClient.deleteWebhook.mockResolvedValue({
        success: true,
        data: undefined,
      });
      telegramBotRepository.archive.mockResolvedValue(bot);

      const result = await service.disconnect(userId);

      expect(result).toEqual({ success: true, data: true });
      expect(telegramBotRepository.update).toHaveBeenCalledWith(
        { id: bot.id, userId },
        { status: TelegramBotStatus.DELETING },
      );
      expect(telegramApiClient.deleteWebhook).toHaveBeenCalledWith(bot.token);
      expect(telegramBotRepository.archive).toHaveBeenCalledWith({
        id: bot.id,
        userId,
      });
    });

    it("still archives when deleteWebhook fails", async () => {
      const userId = faker.string.uuid();
      const bot = fakeTelegramBot();

      telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
      telegramBotRepository.update.mockResolvedValue(bot);
      telegramApiClient.deleteWebhook.mockResolvedValue({
        success: false,
        error: "Some error",
      });
      telegramBotRepository.archive.mockResolvedValue(bot);

      const result = await service.disconnect(userId);

      expect(result).toEqual({ success: true, data: true });
      expect(telegramBotRepository.update).toHaveBeenCalledWith(
        { id: bot.id, userId },
        { status: TelegramBotStatus.DELETING },
      );
      expect(telegramBotRepository.archive).toHaveBeenCalledWith({
        id: bot.id,
        userId,
      });
    });

    it("returns failure when no connected bot found", async () => {
      const userId = faker.string.uuid();
      telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(null);

      const result = await service.disconnect(userId);

      expect(result).toEqual({
        success: false,
        error: "No connected bot found",
      });
    });
  });

  describe("test", () => {
    it("returns success when webhook is registered", async () => {
      const userId = faker.string.uuid();
      const bot = fakeTelegramBot();

      telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
      telegramApiClient.getWebhookInfo.mockResolvedValue({
        success: true,
        data: { url: "http://telegram.localhost/webhooks/telegram" },
      });

      const result = await service.test(userId);

      expect(result).toEqual({ success: true, data: true });
    });

    it("returns failure when webhook URL does not match", async () => {
      const userId = faker.string.uuid();
      const bot = fakeTelegramBot();

      telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
      telegramApiClient.getWebhookInfo.mockResolvedValue({
        success: true,
        data: { url: "http://telegram.localhost/telegram/unexpected-webhook" },
      });

      const result = await service.test(userId);

      expect(result).toEqual({
        success: false,
        error: "Bot webhook is not registered",
      });
    });

    it("returns failure when getWebhookInfo fails", async () => {
      const userId = faker.string.uuid();
      const bot = fakeTelegramBot();

      telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
      telegramApiClient.getWebhookInfo.mockResolvedValue({
        success: false,
        error: "Some error",
      });

      const result = await service.test(userId);

      expect(result).toEqual({
        success: false,
        error: "Failed to reach Telegram. Check the bot is still active.",
      });
    });

    it("returns failure when no connected bot found", async () => {
      const userId = faker.string.uuid();

      telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(null);

      const result = await service.test(userId);

      expect(result).toEqual({
        success: false,
        error: "No connected bot found",
      });
    });
  });

  describe("findOneConnectedByUserId", () => {
    it("returns null when no bot is connected", async () => {
      const userId = faker.string.uuid();
      telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(null);

      const result = await service.findOneConnectedByUserId(userId);

      expect(result).toEqual({ success: true, data: null });
    });

    it("returns masked bot when connected", async () => {
      const userId = faker.string.uuid();
      const bot = fakeTelegramBot({ token: "1234567890" });
      telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);

      const result = await service.findOneConnectedByUserId(userId);

      expect(result).toEqual({
        success: true,
        data: {
          id: bot.id,
          maskedToken: "••••7890",
        },
      });
    });
  });

  describe("acceptMessage", () => {
    it("dispatches background job", async () => {
      const webhookSecret = faker.string.uuid();
      const bot = fakeTelegramBot();
      telegramBotRepository.findOneConnectedByWebhookSecret.mockResolvedValue(
        bot,
      );
      backgroundJobDispatcher.dispatch.mockResolvedValue(undefined);

      const result = await service.acceptMessage(webhookSecret, {
        chatId: 12345,
        text: "Hello",
      });

      expect(result).toEqual({ success: true, data: undefined });
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
      telegramBotRepository.findOneConnectedByWebhookSecret.mockResolvedValue(
        null,
      );

      const result = await service.acceptMessage("unknown-secret", {
        chatId: 123456,
        text: "Hello?",
      });

      expect(result).toEqual({ success: true, data: undefined });

      expect(backgroundJobDispatcher.dispatch).not.toHaveBeenCalled();
    });
  });
});
