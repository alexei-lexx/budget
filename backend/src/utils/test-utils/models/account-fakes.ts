import { faker } from "@faker-js/faker";
import {
  Account,
  AccountData,
  CreateAccountInput,
} from "../../../models/account";

export const fakeAccount = (overrides: Partial<AccountData> = {}): Account => {
  const now = new Date().toISOString();
  return Account.fromPersistence({
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    name: faker.finance.accountName(),
    currency: faker.helpers.arrayElement(["EUR", "USD"]),
    initialBalance: faker.number.int({ min: 0, max: 10000 }),
    isArchived: false,
    // Randomized to surface tests that wrongly assume a specific version.
    version: faker.number.int({ min: 1, max: 100 }),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
};

export const fakeCreateAccountInput = (
  overrides: Partial<CreateAccountInput> = {},
): CreateAccountInput => {
  return {
    userId: faker.string.uuid(),
    name: `${faker.finance.accountName()}-${faker.string.uuid()}`,
    currency: faker.helpers.arrayElement(["EUR", "USD"]),
    initialBalance: faker.number.int({ min: 0, max: 10000 }),
    ...overrides,
  };
};
