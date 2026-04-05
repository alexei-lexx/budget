import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fakeTelegramBot } from "../utils/test-utils/models/telegram-bot-fakes";
import { createMockTelegramApiClient } from "../utils/test-utils/providers/telegram-api-client-mocks";
import { createMockTelegramBotRepository } from "../utils/test-utils/repositories/telegram-bot-repository-mocks";
import { InsightService } from "./agent-services/insight-service";
import { ProcessTelegramMessageService } from "./process-telegram-message-service";

describe("ProcessTelegramMessageService", () => {
  let insightService: jest.Mocked<Pick<InsightService, "call">>;
  let telegramApiClient: ReturnType<typeof createMockTelegramApiClient>;
  let telegramBotRepository: ReturnType<typeof createMockTelegramBotRepository>;
  let service: ProcessTelegramMessageService;

  const chatId = faker.number.int();
  const userId = faker.string.uuid();

  beforeEach(() => {
    insightService = { call: jest.fn() };
    telegramApiClient = createMockTelegramApiClient();
    telegramBotRepository = createMockTelegramBotRepository();

    service = new ProcessTelegramMessageService({
      telegramBotRepository,
      telegramApiClient,
      insightService: insightService as unknown as InsightService,
    });

    jest.clearAllMocks();
  });

  it("should do nothing when bot is not found", async () => {
    telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(null);

    const result = await service.call({
      botId: "some-id",
      userId,
      chatId,
      text: "hello",
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(telegramApiClient.sendMessage).not.toHaveBeenCalled();
  });

  it("should do nothing when connected bot id does not match", async () => {
    const bot = fakeTelegramBot();
    telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);

    const result = await service.call({
      botId: "stale-id",
      userId,
      chatId,
      text: "hello",
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
      userId,
      chatId,
      text: null,
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(telegramApiClient.sendMessage).toHaveBeenCalledWith({
      token: bot.token,
      chatId,
      text: "I can only process text messages",
    });
    expect(insightService.call).not.toHaveBeenCalled();
  });

  it("should call InsightService and reply with the answer", async () => {
    const bot = fakeTelegramBot();
    telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
    telegramApiClient.sendMessage.mockResolvedValue({
      success: true,
      data: undefined,
    });
    insightService.call.mockResolvedValue({
      success: true,
      data: { answer: "You spent 50 euro", agentTrace: [] },
    });

    const result = await service.call({
      botId: bot.id,
      userId,
      chatId,
      text: "How much did I spend?",
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(insightService.call).toHaveBeenCalledWith(userId, {
      question: "How much did I spend?",
    });
    expect(telegramApiClient.sendMessage).toHaveBeenCalledWith({
      token: bot.token,
      chatId,
      text: "You spent 50 euro",
    });
  });

  it("should reply with error message when InsightService fails", async () => {
    const bot = fakeTelegramBot({ userId });
    telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
    telegramApiClient.sendMessage.mockResolvedValue({
      success: true,
      data: undefined,
    });
    insightService.call.mockResolvedValue({
      success: false,
      error: { message: "No data available", agentTrace: [] },
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
    telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
    telegramApiClient.sendMessage.mockResolvedValue({
      success: false,
      error: "Telegram API error",
    });
    insightService.call.mockResolvedValue({
      success: true,
      data: { answer: "You spent 50 euro", agentTrace: [] },
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
