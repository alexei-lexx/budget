import { jest } from "@jest/globals";
import { TelegramApiClient } from "../../../services/ports/telegram-api-client";

export const createMockTelegramApiClient =
  (): jest.Mocked<TelegramApiClient> => ({
    getWebhookInfo: jest.fn(),
    setWebhook: jest.fn(),
    deleteWebhook: jest.fn(),
    sendMessage: jest.fn(),
  });
