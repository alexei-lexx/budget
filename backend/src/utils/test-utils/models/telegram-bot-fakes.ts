import { faker } from "@faker-js/faker";
import { TelegramBot, TelegramBotStatus } from "../../../models/telegram-bot";

export const fakeTelegramBot = (
  overrides: Partial<TelegramBot> = {},
): TelegramBot => {
  const now = new Date().toISOString();
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    token: faker.string.uuid(),
    webhookSecret: faker.string.uuid(),
    status: faker.helpers.arrayElement([
      TelegramBotStatus.CONNECTED,
      TelegramBotStatus.DELETING,
      TelegramBotStatus.PENDING,
    ]),
    isArchived: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};
