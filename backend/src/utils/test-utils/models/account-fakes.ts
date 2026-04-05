import { faker } from "@faker-js/faker";
import { Account } from "../../../models/account-fakes";

export const fakeAccount = (overrides: Partial<Account> = {}): Account => {
  const now = new Date().toISOString();
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    name: faker.finance.accountName(),
    currency: "USD",
    initialBalance: faker.number.int({ min: 0, max: 10000 }),
    isArchived: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};
