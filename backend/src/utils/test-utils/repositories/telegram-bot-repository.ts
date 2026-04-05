import { faker } from "@faker-js/faker";
import { jest } from "@jest/globals";
import { TelegramBotStatus } from "../../../models/telegram-bot";
import {
  CreateTelegramBotInput,
  TelegramBotRepository,
} from "../../../services/ports/telegram-bot-repository";

/**
 * Mock telegram bot repository for testing
 */
export const createMockTelegramBotRepository =
  (): jest.Mocked<TelegramBotRepository> => ({
    findOneConnectedByUserId: jest.fn(),
    findOneConnectedByWebhookSecret: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
  });

