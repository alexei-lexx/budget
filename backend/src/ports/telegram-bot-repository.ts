import { TelegramBot } from "../models/telegram-bot";

export interface TelegramBotRepository {
  findOneConnectedByUserId(userId: string): Promise<TelegramBot | null>;
  findOneConnectedByWebhookSecret(
    webhookSecret: string,
  ): Promise<TelegramBot | null>;
  create(bot: Readonly<TelegramBot>): Promise<void>;
  update(bot: Readonly<TelegramBot>): Promise<TelegramBot>;
}
