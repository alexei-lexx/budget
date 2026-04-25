import { faker } from "@faker-js/faker";
import {
  CreateTransactionInput,
  Transaction,
  TransactionEntity,
  TransactionPattern,
  TransactionType,
} from "../../../models/transaction";
import { toDateString } from "../../../types/date";
import { fakeAccount } from "./account-fakes";

export const fakeTransaction = (
  overrides: Partial<Transaction> = {},
): Transaction => {
  const now = new Date().toISOString();
  const type = overrides.type ?? TransactionType.EXPENSE;
  const isTransfer =
    type === TransactionType.TRANSFER_IN ||
    type === TransactionType.TRANSFER_OUT;

  return TransactionEntity.fromPersistence({
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    accountId: faker.string.uuid(),
    categoryId: isTransfer ? undefined : faker.string.uuid(),
    amount: faker.number.float({ min: 1, max: 1000, fractionDigits: 2 }),
    type,
    currency: faker.helpers.arrayElement(["EUR", "USD"]),
    date: toDateString(faker.date.recent().toISOString().split("T")[0]),
    description: faker.finance.transactionDescription(),
    transferId: isTransfer ? faker.string.uuid() : undefined,
    isArchived: false,
    version: faker.number.int({ min: 1, max: 100 }),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
};

export const fakeCreateTransactionInput = (
  overrides: Partial<CreateTransactionInput> = {},
): CreateTransactionInput => {
  const userId = overrides.userId ?? faker.string.uuid();
  const account = overrides.account ?? fakeAccount({ userId });

  return {
    userId,
    account,
    type: TransactionType.EXPENSE,
    amount: faker.number.float({ min: 1, max: 1000, fractionDigits: 2 }),
    date: toDateString(faker.date.recent().toISOString().split("T")[0]),
    description: faker.finance.transactionDescription(),
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
