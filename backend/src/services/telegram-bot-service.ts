import { TelegramBot } from "../models/telegram-bot";
import { BackgroundJobDispatcher } from "../ports/background-job-dispatcher";
import { TelegramApiClient } from "../ports/telegram-api-client";
import { TelegramBotRepository } from "../ports/telegram-bot-repository";
import { BusinessError } from "./business-error";

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
  private readonly apiBaseUrl: string;
  private readonly backgroundJobDispatcher: BackgroundJobDispatcher;
  private readonly telegramApiClient: TelegramApiClient;
  private readonly telegramBotRepository: TelegramBotRepository;

  constructor(deps: {
    apiBaseUrl: string;
    backgroundJobDispatcher: BackgroundJobDispatcher;
    telegramApiClient: TelegramApiClient;
    telegramBotRepository: TelegramBotRepository;
  }) {
    this.apiBaseUrl = deps.apiBaseUrl;
    this.backgroundJobDispatcher = deps.backgroundJobDispatcher;
    this.telegramApiClient = deps.telegramApiClient;
    this.telegramBotRepository = deps.telegramBotRepository;
  }

  async findOneConnectedByUserId(
    userId: string,
  ): Promise<MaskedTelegramBot | null> {
    if (!userId) {
      throw new BusinessError("User ID is required");
    }

    const bot =
      await this.telegramBotRepository.findOneConnectedByUserId(userId);

    if (!bot) {
      return null;
    }

    return maskTelegramBot(bot);
  }

  async test(userId: string): Promise<boolean> {
    if (!userId) {
      throw new BusinessError("User ID is required");
    }

    const bot =
      await this.telegramBotRepository.findOneConnectedByUserId(userId);

    if (!bot) {
      throw new BusinessError("No connected bot found");
    }

    const infoResult = await this.telegramApiClient.getWebhookInfo(bot.token);

    if (!infoResult.success) {
      throw new BusinessError(
        "Failed to reach Telegram. Check the bot is still active.",
      );
    }

    if (infoResult.data.url !== this.webhookUrl) {
      throw new BusinessError("Bot webhook is not registered");
    }

    return true;
  }

  async connect(userId: string, token: string): Promise<MaskedTelegramBot> {
    if (!userId) {
      throw new BusinessError("User ID is required");
    }

    const trimmedToken = token.trim();

    if (!trimmedToken) {
      throw new BusinessError("Bot token is required");
    }

    const existingConnectedBot =
      await this.telegramBotRepository.findOneConnectedByUserId(userId);

    if (existingConnectedBot) {
      throw new BusinessError(
        "A bot is already connected. Disconnect it first.",
      );
    }

    // Create a PENDING record first
    const bot = TelegramBot.create({ userId, token: trimmedToken });
    await this.telegramBotRepository.create(bot);

    const setWebhookResult = await this.telegramApiClient.setWebhook({
      secretToken: bot.webhookSecret,
      token: bot.token,
      url: this.webhookUrl,
    });

    if (!setWebhookResult.success) {
      // setWebhook failed — archive the pending record to avoid stuck records
      await this.telegramBotRepository.update(bot.archive());

      throw new BusinessError(
        "Failed to connect Telegram bot. Check the token and try again.",
      );
    }

    const connected = await this.telegramBotRepository.update(bot.connect());

    return maskTelegramBot(connected);
  }

  async disconnect(userId: string): Promise<boolean> {
    if (!userId) {
      throw new BusinessError("User ID is required");
    }

    const bot =
      await this.telegramBotRepository.findOneConnectedByUserId(userId);

    if (!bot) {
      throw new BusinessError("No connected bot found");
    }

    const deletingBot = await this.telegramBotRepository.update(
      bot.disconnect(),
    );

    // Best-effort: delete the webhook from Telegram before archiving
    // Failure is non-fatal
    await this.telegramApiClient.deleteWebhook(bot.token);
    await this.telegramBotRepository.update(deletingBot.archive());

    return true;
  }

  async acceptMessage(
    webhookSecret: string,
    message: { chatId: number; text?: string },
  ): Promise<void> {
    if (!webhookSecret) {
      throw new BusinessError("Webhook secret is required");
    }

    const bot =
      await this.telegramBotRepository.findOneConnectedByWebhookSecret(
        webhookSecret,
      );

    if (!bot) {
      // Unknown or inactive bot — silently ignore
      console.warn("Unknown or inactive bot");
      return;
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
  }

  private get webhookUrl(): string {
    return `${this.apiBaseUrl}/webhooks/telegram`;
  }
}
