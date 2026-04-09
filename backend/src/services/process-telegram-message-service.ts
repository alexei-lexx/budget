import { Failure, Result, Success } from "../types/result";
import { AssistantChatService } from "./agent-services/assistant-chat-service";
import { TelegramApiClient } from "./ports/telegram-api-client";
import { TelegramBotRepository } from "./ports/telegram-bot-repository";

export interface ProcessTelegramMessageInput {
  botId: string;
  chatId: number;
  text: string | null;
  userId: string;
}

export class ProcessTelegramMessageService {
  private readonly assistantChatService: AssistantChatService;
  private readonly telegramApiClient: TelegramApiClient;
  private readonly telegramBotRepository: TelegramBotRepository;

  constructor(deps: {
    assistantChatService: AssistantChatService;
    telegramApiClient: TelegramApiClient;
    telegramBotRepository: TelegramBotRepository;
  }) {
    this.assistantChatService = deps.assistantChatService;
    this.telegramApiClient = deps.telegramApiClient;
    this.telegramBotRepository = deps.telegramBotRepository;
  }

  async call(input: ProcessTelegramMessageInput): Promise<Result<void>> {
    const { botId, userId, chatId, text } = input;

    const bot =
      await this.telegramBotRepository.findOneConnectedByUserId(userId);

    if (!bot) {
      // No connected bot for this user — nothing to do
      console.warn(`No connected bot found for user ${userId}`);
      return Success(undefined);
    }

    if (bot.id !== botId) {
      // User reconnected a different bot — nothing to do
      console.warn(
        `Received message for bot ${botId}, but currently connected bot for user ${userId} is ${bot.id}`,
      );
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

    // Derive a deterministic sessionId from the bot+chat context
    const sessionId = `${botId}#${chatId}`;

    const assistantResult = await this.assistantChatService.call(userId, {
      question: text,
      sessionId,
    });

    const replyText = assistantResult.success
      ? assistantResult.data.answer
      : assistantResult.error.message || "Unknown error occurred";

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
