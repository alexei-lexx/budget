import { randomUUID } from "crypto";
import { TelegramBot, TelegramBotStatus } from "../models/telegram-bot";
import { BackgroundJobDispatcher } from "../ports/background-job-dispatcher";
import { TelegramApiClient } from "../ports/telegram-api-client";
import { TelegramBotRepository } from "../ports/telegram-bot-repository";
import { Failure, Result, Success } from "../types/result";

export interface MaskedTelegramBot {
  id: string;
  maskedToken: string;
}

function maskToken(token: string): string {
  return `••••${token.slice(-4)}`;
}

function maskTelegramBot(bot: TelegramBot): MaskedTelegramBot {
  return {
    id: bot.id,
    maskedToken: maskToken(bot.token),
  };
}

export class TelegramBotService {
  private readonly backgroundJobDispatcher: BackgroundJobDispatcher;
  private readonly telegramApiClient: TelegramApiClient;
  private readonly telegramBotRepository: TelegramBotRepository;
  private readonly webhookBaseUrl: string;

  constructor(deps: {
    backgroundJobDispatcher: BackgroundJobDispatcher;
    telegramApiClient: TelegramApiClient;
    telegramBotRepository: TelegramBotRepository;
    webhookBaseUrl: string;
  }) {
    this.backgroundJobDispatcher = deps.backgroundJobDispatcher;
    this.telegramApiClient = deps.telegramApiClient;
    this.telegramBotRepository = deps.telegramBotRepository;
    this.webhookBaseUrl = deps.webhookBaseUrl;
  }

  async findOneConnectedByUserId(
    userId: string,
  ): Promise<Result<MaskedTelegramBot | null>> {
    if (!userId) {
      return Failure("User ID is required");
    }

    const bot =
      await this.telegramBotRepository.findOneConnectedByUserId(userId);

    if (!bot) {
      return Success(null);
    }

    return Success(maskTelegramBot(bot));
  }

  async test(userId: string): Promise<Result<boolean>> {
    if (!userId) {
      return Failure("User ID is required");
    }

    const bot =
      await this.telegramBotRepository.findOneConnectedByUserId(userId);

    if (!bot) {
      return Failure("No connected bot found");
    }

    const infoResult = await this.telegramApiClient.getWebhookInfo(bot.token);

    if (!infoResult.success) {
      return Failure(
        "Failed to reach Telegram. Check the bot is still active.",
      );
    }

    if (infoResult.data.url !== this.webhookUrl) {
      return Failure("Bot webhook is not registered");
    }

    return Success(true);
  }

  async connect(
    userId: string,
    token: string,
  ): Promise<Result<MaskedTelegramBot>> {
    if (!userId) {
      return Failure("User ID is required");
    }

    const trimmedToken = token.trim();

    if (!trimmedToken) {
      return Failure("Bot token is required");
    }

    const existingConnectedBot =
      await this.telegramBotRepository.findOneConnectedByUserId(userId);

    if (existingConnectedBot) {
      return Failure("A bot is already connected. Disconnect it first.");
    }

    const webhookSecret = randomUUID();

    // Create a PENDING record first
    const bot = await this.telegramBotRepository.create({
      userId,
      token: trimmedToken,
      webhookSecret,
      status: TelegramBotStatus.PENDING,
    });

    const setWebhookResult = await this.telegramApiClient.setWebhook({
      secretToken: webhookSecret,
      token: trimmedToken,
      url: this.webhookUrl,
    });

    if (!setWebhookResult.success) {
      // setWebhook failed — archive the pending record to avoid stuck records
      await this.telegramBotRepository.archive({ id: bot.id, userId });

      return Failure(
        "Failed to connect Telegram bot. Check the token and try again.",
      );
    }

    const connected = await this.telegramBotRepository.update(
      { id: bot.id, userId },
      { status: TelegramBotStatus.CONNECTED },
    );

    return Success(maskTelegramBot(connected));
  }

  async disconnect(userId: string): Promise<Result<boolean>> {
    if (!userId) {
      return Failure("User ID is required");
    }

    const bot =
      await this.telegramBotRepository.findOneConnectedByUserId(userId);

    if (!bot) {
      return Failure("No connected bot found");
    }

    await this.telegramBotRepository.update(
      { id: bot.id, userId },
      { status: TelegramBotStatus.DELETING },
    );

    // Best-effort: delete the webhook from Telegram before archiving
    // Failure is non-fatal
    await this.telegramApiClient.deleteWebhook(bot.token);
    await this.telegramBotRepository.archive({ id: bot.id, userId });

    return Success(true);
  }

  async acceptMessage(
    webhookSecret: string,
    message: { chatId: number; text?: string },
  ): Promise<Result<void>> {
    if (!webhookSecret) {
      return Failure("Webhook secret is required");
    }

    const bot =
      await this.telegramBotRepository.findOneConnectedByWebhookSecret(
        webhookSecret,
      );

    if (!bot) {
      // Unknown or inactive bot — silently ignore
      console.warn("Unknown or inactive bot");
      return Success(undefined);
    }

    await this.backgroundJobDispatcher.dispatch({
      type: "telegram-message",
      payload: {
        botId: bot.id,
        chatId: message.chatId,
        text: message.text ?? null,
        userId: bot.userId,
      },
    });

    return Success(undefined);
  }

  private get webhookUrl(): string {
    return `${this.webhookBaseUrl}/webhooks/telegram`;
  }
}
