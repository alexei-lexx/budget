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

export const fakeCreateTelegramBotInput = (
  overrides: Partial<CreateTelegramBotInput> = {},
): CreateTelegramBotInput => {
  return {
    userId: faker.string.uuid(),
    token: faker.string.uuid(),
    webhookSecret: faker.string.uuid(),
    status: faker.helpers.arrayElement([
      TelegramBotStatus.CONNECTED,
      TelegramBotStatus.DELETING,
      TelegramBotStatus.PENDING,
    ]),
    ...overrides,
  };
};
