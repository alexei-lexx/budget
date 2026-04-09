import { faker } from "@faker-js/faker";
import {
  Transaction,
  TransactionData,
  TransactionPattern,
  TransactionType,
} from "../../../models/transaction";
import { toDateString } from "../../../types/date";

export const fakeTransactionData = (
  overrides: Partial<TransactionData> = {},
): TransactionData => {
  const now = new Date().toISOString();
  const type =
    overrides.type ??
    faker.helpers.arrayElement([
      TransactionType.EXPENSE,
      TransactionType.INCOME,
      TransactionType.REFUND,
      TransactionType.TRANSFER_IN,
      TransactionType.TRANSFER_OUT,
    ]);
  const transferId =
    type === TransactionType.TRANSFER_IN ||
    type === TransactionType.TRANSFER_OUT
      ? faker.string.uuid()
      : undefined;

  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    accountId: faker.string.uuid(),
    amount: faker.number.float({ min: 1, max: 1000, fractionDigits: 2 }),
    type,
    currency: "USD",
    description: faker.finance.transactionDescription(),
    date: toDateString(faker.date.recent().toISOString().split("T")[0]),
    categoryId: faker.string.uuid(),
    isArchived: false,
    transferId,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

export const fakeTransaction = (
  overrides: Partial<TransactionData> = {},
): Transaction => Transaction.build(fakeTransactionData(overrides));

export const fakeTransactionPattern = (
  overrides: Partial<TransactionPattern> = {},
): TransactionPattern => {
  return {
    accountId: faker.string.uuid(),
    categoryId: faker.string.uuid(),
    ...overrides,
  };
};
