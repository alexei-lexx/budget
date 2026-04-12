import { TelegramBot, TelegramBotStatus } from "../models/telegram-bot";

export interface CreateTelegramBotInput {
  userId: string;
  token: string;
  webhookSecret: string;
  status: TelegramBotStatus;
}

export interface UpdateTelegramBotInput {
  status?: TelegramBotStatus;
}

export interface TelegramBotRepository {
  findOneConnectedByUserId(userId: string): Promise<TelegramBot | null>;
  findOneConnectedByWebhookSecret(
    webhookSecret: string,
  ): Promise<TelegramBot | null>;
  create(input: CreateTelegramBotInput): Promise<TelegramBot>;
  update(
    selector: { id: string; userId: string },
    input: UpdateTelegramBotInput,
  ): Promise<TelegramBot>;
  archive(selector: { id: string; userId: string }): Promise<TelegramBot>;
}
