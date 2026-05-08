import { type Mocked, vi } from "vitest";
import { TelegramBotRepository } from "../../../ports/telegram-bot-repository";

/**
 * Mock telegram bot repository for testing
 */
export const createMockTelegramBotRepository =
  (): Mocked<TelegramBotRepository> => ({
    findOneConnectedByUserId: vi.fn(),
    findOneConnectedByWebhookSecret: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
  });
