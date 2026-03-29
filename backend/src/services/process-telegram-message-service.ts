import { Failure, Result, Success } from "../types/result";
import { InsightService } from "./insight-service";
import { TelegramApiClient } from "./ports/telegram-api-client";
import { TelegramBotRepository } from "./ports/telegram-bot-repository";

export interface ProcessTelegramMessageInput {
  chatId: number;
  text: string | null;
  userId: string;
}

export class ProcessTelegramMessageService {
  private readonly insightService: InsightService;
  private readonly telegramApiClient: TelegramApiClient;
  private readonly telegramBotRepository: TelegramBotRepository;

  constructor(deps: {
    insightService: InsightService;
    telegramApiClient: TelegramApiClient;
    telegramBotRepository: TelegramBotRepository;
  }) {
    this.insightService = deps.insightService;
    this.telegramApiClient = deps.telegramApiClient;
    this.telegramBotRepository = deps.telegramBotRepository;
  }

  async call(input: ProcessTelegramMessageInput): Promise<Result<void>> {
    const { userId, chatId, text } = input;

    const bot =
      await this.telegramBotRepository.findOneConnectedByUserId(userId);

    if (!bot) {
      // Bot no longer active — nothing to do
      return Success(undefined);
    }

    if (!text) {
      const result = await this.telegramApiClient.sendMessage({
        token: bot.token,
        chatId,
        text: "I can only process text messages",
      });

      if (!result.success) {
        console.error("Failed to send reply:", result.error);
        return Failure(result.error);
      }

      return Success(undefined);
    }

    const insightResult = await this.insightService.call(userId, {
      question: text,
    });

    const replyText = insightResult.success
      ? insightResult.data.answer
      : insightResult.error.message || "Unknown error occurred";

    const result = await this.telegramApiClient.sendMessage({
      token: bot.token,
      chatId,
      text: replyText,
    });

    if (!result.success) {
      console.error("Failed to send reply:", result.error);
      return Failure(result.error);
    }

    return Success(undefined);
  }
}
