import { faker } from "@faker-js/faker";
import {
  CreateTelegramBotInput,
  TELEGRAM_BOT_STATUSES,
  TelegramBot,
  TelegramBotData,
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
    status: faker.helpers.arrayElement(TELEGRAM_BOT_STATUSES),
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

export const fakePendingTelegramBot = (
  overrides: Partial<Omit<TelegramBotData, "status">> = {},
): TelegramBot => fakeTelegramBot({ status: "PENDING", ...overrides });

export const fakeConnectedTelegramBot = (
  overrides: Partial<Omit<TelegramBotData, "status">> = {},
): TelegramBot => fakeTelegramBot({ status: "CONNECTED", ...overrides });

export const fakeDeletingTelegramBot = (
  overrides: Partial<Omit<TelegramBotData, "status">> = {},
): TelegramBot => fakeTelegramBot({ status: "DELETING", ...overrides });
