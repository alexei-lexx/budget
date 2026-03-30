import { BackgroundJobDispatcher } from "../../services/ports/background-job-dispatcher";
import { TelegramApiClient } from "../../services/ports/telegram-api-client";

export const createMockTelegramApiClient =
  (): jest.Mocked<TelegramApiClient> => ({
    getWebhookInfo: jest.fn(),
    setWebhook: jest.fn(),
    deleteWebhook: jest.fn(),
    sendMessage: jest.fn(),
  });

export const createMockBackgroundJobDispatcher =
  (): jest.Mocked<BackgroundJobDispatcher> => ({
    dispatch: jest.fn(),
  });
