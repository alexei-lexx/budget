import { vi, type Mocked } from "vitest";
import { TelegramApiClient } from "../../../ports/telegram-api-client";

export const createMockTelegramApiClient =
  (): Mocked<TelegramApiClient> => ({
    getWebhookInfo: vi.fn(),
    setWebhook: vi.fn(),
    deleteWebhook: vi.fn(),
    sendMessage: vi.fn(),
  });
