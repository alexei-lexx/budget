import { faker } from "@faker-js/faker";
import {
  CreateTelegramBotInput,
  TelegramBot,
  TelegramBotData,
  TelegramBotStatus,
} from "../../../models/telegram-bot";
import { toDateTimeString } from "../../../types/date-time-string";

export const fakeTelegramBot = (
  overrides: Partial<TelegramBotData> = {},
): TelegramBot => {
  const now = toDateTimeString(new Date().toISOString());
  return TelegramBot.fromPersistence({
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
  });
};

export const fakeCreateTelegramBotInput = (
  overrides: Partial<CreateTelegramBotInput> = {},
): CreateTelegramBotInput => {
  return {
    userId: faker.string.uuid(),
    token: faker.string.uuid(),
    ...overrides,
  };
};
