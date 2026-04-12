import { faker } from "@faker-js/faker";
import { TelegramBotStatus } from "../../../models/telegram-bot";
import { CreateTelegramBotInput } from "../../../ports/telegram-bot-repository";

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
