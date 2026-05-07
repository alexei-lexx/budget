import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { TelegramApiClient } from "../ports/telegram-api-client";
import { TelegramBotRepository } from "../ports/telegram-bot-repository";
import { fakeTelegramBot } from "../utils/test-utils/models/telegram-bot-fakes";
import { createMockTelegramApiClient } from "../utils/test-utils/providers/telegram-api-client-mocks";
import { createMockTelegramBotRepository } from "../utils/test-utils/repositories/telegram-bot-repository-mocks";
import { AssistantChatService } from "./assistant-chat-service";
import { ProcessTelegramMessageService } from "./process-telegram-message-service";

describe("ProcessTelegramMessageService", () => {
  let mockAssistantChatService: jest.Mocked<AssistantChatService>;
  let mockTelegramApiClient: jest.Mocked<TelegramApiClient>;
  let mockTelegramBotRepository: jest.Mocked<TelegramBotRepository>;
  let service: ProcessTelegramMessageService;
  let chatId: number;
  let userId: string;

  beforeEach(() => {
    mockAssistantChatService = { call: jest.fn() };
    mockTelegramApiClient = createMockTelegramApiClient();
    mockTelegramBotRepository = createMockTelegramBotRepository();

    service = new ProcessTelegramMessageService({
      assistantChatService: mockAssistantChatService,
      telegramApiClient: mockTelegramApiClient,
      telegramBotRepository: mockTelegramBotRepository,
    });

    chatId = faker.number.int();
    userId = faker.string.uuid();
  });

  describe("call", () => {
    // Happy path

    it("succeeds silently when no bot is connected", async () => {
      // Arrange

      // No connected bot for user
      mockTelegramBotRepository.findOneConnectedByUserId.mockResolvedValue(
        null,
      );

      // Act
      const result = await service.call({
        botId: "some-id",
        chatId,
        text: "hello",
        userId,
      });

      // Assert
      expect(result).toEqual({ success: true, data: undefined });
      expect(mockTelegramApiClient.sendMessage).not.toHaveBeenCalled();
      expect(mockAssistantChatService.call).not.toHaveBeenCalled();
    });

    it("succeeds silently when connected bot id does not match incoming botId", async () => {
      // Arrange
      const bot = fakeTelegramBot();

      // Connected bot has different id than incoming message
      mockTelegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);

      // Act
      const result = await service.call({
        botId: "stale-id",
        chatId,
        text: "hello",
        userId,
      });

      // Assert
      expect(result).toEqual({ success: true, data: undefined });
      expect(mockTelegramApiClient.sendMessage).not.toHaveBeenCalled();
      expect(mockAssistantChatService.call).not.toHaveBeenCalled();
    });

    it("replies with non-text notice when text is null", async () => {
      // Arrange
      const bot = fakeTelegramBot();

      // Connected bot matches incoming message
      mockTelegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
      // Telegram delivers reply
      mockTelegramApiClient.sendMessage.mockResolvedValue({
        success: true,
        data: undefined,
      });

      // Act
      const result = await service.call({
        botId: bot.id,
        chatId,
        text: null,
        userId,
      });

      // Assert
      expect(result).toEqual({ success: true, data: undefined });
      expect(mockTelegramApiClient.sendMessage).toHaveBeenCalledWith({
        chatId,
        text: "I can only process text messages",
        token: bot.token,
      });
      expect(mockAssistantChatService.call).not.toHaveBeenCalled();
    });

    it("replies with assistant answer for text input", async () => {
      // Arrange
      const bot = fakeTelegramBot();
      const sessionId = `${bot.id}#${chatId}`;

      // Connected bot matches incoming message
      mockTelegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
      // Telegram delivers reply
      mockTelegramApiClient.sendMessage.mockResolvedValue({
        success: true,
        data: undefined,
      });
      // Assistant answers question
      mockAssistantChatService.call.mockResolvedValue({
        success: true,
        data: { answer: "You spent 50 euro", agentTrace: [], sessionId },
      });

      // Act
      const result = await service.call({
        botId: bot.id,
        chatId,
        text: "How much did I spend?",
        userId,
      });

      // Assert
      expect(result).toEqual({ success: true, data: undefined });
      expect(mockAssistantChatService.call).toHaveBeenCalledWith(userId, {
        question: "How much did I spend?",
        sessionId,
      });
      expect(mockTelegramApiClient.sendMessage).toHaveBeenCalledWith({
        token: bot.token,
        chatId,
        text: "You spent 50 euro",
      });
    });

    it("relays assistant error message to user", async () => {
      // Arrange
      const bot = fakeTelegramBot({ userId });

      // Connected bot matches incoming message
      mockTelegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
      // Telegram delivers reply
      mockTelegramApiClient.sendMessage.mockResolvedValue({
        success: true,
        data: undefined,
      });
      // Assistant returns business failure
      mockAssistantChatService.call.mockResolvedValue({
        success: false,
        error: {
          message: "No data available",
          agentTrace: [],
          sessionId: faker.string.uuid(),
        },
      });

      // Act
      const result = await service.call({
        botId: bot.id,
        userId,
        chatId,
        text: "What is my balance?",
      });

      // Assert
      expect(result).toEqual({ success: true, data: undefined });
      expect(mockTelegramApiClient.sendMessage).toHaveBeenCalledWith({
        token: bot.token,
        chatId,
        text: "No data available",
      });
    });

    // Dependency failures

    it("returns failure when telegram sendMessage fails", async () => {
      // Arrange
      const bot = fakeTelegramBot({ userId });
      const sessionId = `${bot.id}#${chatId}`;

      // Connected bot matches incoming message
      mockTelegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
      // Telegram rejects send
      mockTelegramApiClient.sendMessage.mockResolvedValue({
        success: false,
        error: "Telegram API error",
      });
      // Assistant answers question
      mockAssistantChatService.call.mockResolvedValue({
        success: true,
        data: { answer: "You spent 50 euro", agentTrace: [], sessionId },
      });

      // Act
      const result = await service.call({
        botId: bot.id,
        userId,
        chatId,
        text: "How much did I spend?",
      });

      // Assert
      expect(result).toEqual({ success: false, error: "Telegram API error" });
    });
  });
});
