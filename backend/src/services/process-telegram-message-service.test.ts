import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fakeTelegramBot } from "../utils/test-utils/models/telegram-bot-fakes";
import { createMockTelegramApiClient } from "../utils/test-utils/providers/telegram-api-client-mocks";
import { createMockTelegramBotRepository } from "../utils/test-utils/repositories/telegram-bot-repository-mocks";
import { InsightChatService } from "./agent-services/insight-chat-service";
import { ProcessTelegramMessageService } from "./process-telegram-message-service";

describe("ProcessTelegramMessageService", () => {
  let insightChatService: jest.Mocked<InsightChatService>;
  let telegramApiClient: ReturnType<typeof createMockTelegramApiClient>;
  let telegramBotRepository: ReturnType<typeof createMockTelegramBotRepository>;
  let service: ProcessTelegramMessageService;

  const chatId = faker.number.int();
  const userId = faker.string.uuid();

  beforeEach(() => {
    insightChatService = { call: jest.fn() };
    telegramApiClient = createMockTelegramApiClient();
    telegramBotRepository = createMockTelegramBotRepository();

    service = new ProcessTelegramMessageService({
      insightChatService,
      telegramApiClient,
      telegramBotRepository,
    });

    jest.clearAllMocks();
  });

  it("should do nothing when bot is not found", async () => {
    telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(null);

    const result = await service.call({
      botId: "some-id",
      chatId,
      text: "hello",
      userId,
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(telegramApiClient.sendMessage).not.toHaveBeenCalled();
  });

  it("should do nothing when connected bot id does not match", async () => {
    const bot = fakeTelegramBot();
    telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);

    const result = await service.call({
      botId: "stale-id",
      chatId,
      text: "hello",
      userId,
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(telegramApiClient.sendMessage).not.toHaveBeenCalled();
  });

  it("should reply with non-text message notice when text is null", async () => {
    const bot = fakeTelegramBot();
    telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
    telegramApiClient.sendMessage.mockResolvedValue({
      success: true,
      data: undefined,
    });

    const result = await service.call({
      botId: bot.id,
      chatId,
      text: null,
      userId,
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(telegramApiClient.sendMessage).toHaveBeenCalledWith({
      chatId,
      text: "I can only process text messages",
      token: bot.token,
    });
    expect(insightChatService.call).not.toHaveBeenCalled();
  });

  it("should call InsightChatService and reply with the answer", async () => {
    const bot = fakeTelegramBot();
    const sessionId = `${bot.id}#${chatId}`;
    telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
    telegramApiClient.sendMessage.mockResolvedValue({
      success: true,
      data: undefined,
    });
    insightChatService.call.mockResolvedValue({
      success: true,
      data: { answer: "You spent 50 euro", agentTrace: [], sessionId },
    });

    const result = await service.call({
      botId: bot.id,
      chatId,
      text: "How much did I spend?",
      userId,
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(insightChatService.call).toHaveBeenCalledWith(userId, {
      question: "How much did I spend?",
      sessionId,
    });
    expect(telegramApiClient.sendMessage).toHaveBeenCalledWith({
      token: bot.token,
      chatId,
      text: "You spent 50 euro",
    });
  });

  it("should reply with error message when InsightChatService fails", async () => {
    const bot = fakeTelegramBot({ userId });
    telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
    telegramApiClient.sendMessage.mockResolvedValue({
      success: true,
      data: undefined,
    });
    insightChatService.call.mockResolvedValue({
      success: false,
      error: {
        message: "No data available",
        agentTrace: [],
        sessionId: faker.string.uuid(),
      },
    });

    const result = await service.call({
      botId: bot.id,
      userId,
      chatId,
      text: "What is my balance?",
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(telegramApiClient.sendMessage).toHaveBeenCalledWith({
      token: bot.token,
      chatId,
      text: "No data available",
    });
  });

  it("should fail when sendMessage fails", async () => {
    const bot = fakeTelegramBot({ userId });
    const sessionId = `${bot.id}#${chatId}`;
    telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
    telegramApiClient.sendMessage.mockResolvedValue({
      success: false,
      error: "Telegram API error",
    });
    insightChatService.call.mockResolvedValue({
      success: true,
      data: { answer: "You spent 50 euro", agentTrace: [], sessionId },
    });

    const result = await service.call({
      botId: bot.id,
      userId,
      chatId,
      text: "How much did I spend?",
    });

    expect(result).toEqual({ success: false, error: "Telegram API error" });
  });
});
