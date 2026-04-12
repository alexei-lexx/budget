import { Result } from "../types/result";

export interface TelegramApiClient {
  getWebhookInfo(token: string): Promise<Result<{ url: string }>>;
  setWebhook(params: {
    token: string;
    url: string;
    secretToken: string;
  }): Promise<Result<void>>;
  deleteWebhook(token: string): Promise<Result<void>>;
  sendMessage(params: {
    token: string;
    chatId: number;
    text: string;
  }): Promise<Result<void>>;
}
