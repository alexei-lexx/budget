import { faker } from "@faker-js/faker";
import {
  Transaction,
  TransactionPattern,
  TransactionType,
} from "../../../models/transaction";
import { toDateString } from "../../../types/date";

export const fakeTransaction = (
  overrides: Partial<Transaction> = {},
): Transaction => {
  const now = new Date().toISOString();
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    accountId: faker.string.uuid(),
    amount: faker.number.float({ min: 1, max: 1000, fractionDigits: 2 }),
    type: TransactionType.EXPENSE,
    currency: "USD",
    description: faker.finance.transactionDescription(),
    date: toDateString(faker.date.recent().toISOString().split("T")[0]),
    categoryId: faker.string.uuid(),
    isArchived: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

export const fakeTransactionPattern = (
  overrides: Partial<TransactionPattern> = {},
): TransactionPattern => {
  return {
    accountId: faker.string.uuid(),
    categoryId: faker.string.uuid(),
    ...overrides,
  };
};
