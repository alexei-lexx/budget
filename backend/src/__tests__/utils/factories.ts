import { faker } from "@faker-js/faker";
import { Account } from "../../models/Account";
import { Category, CategoryType } from "../../models/Category";
import {
  Transaction,
  TransactionType,
  TransactionPattern,
} from "../../models/Transaction";

/**
 * Creates a valid fake Account with optional field overrides
 */
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

/**
 * Creates a valid fake Category with optional field overrides
 */
export const fakeCategory = (overrides: Partial<Category> = {}): Category => {
  const now = new Date().toISOString();
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    name: faker.commerce.department(),
    type: CategoryType.EXPENSE,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

/**
 * Creates a valid fake Transaction with optional field overrides
 */
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
    date: faker.date.recent().toISOString().split("T")[0], // YYYY-MM-DD format
    categoryId: faker.string.uuid(),
    isArchived: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

/**
 * Creates a valid fake TransactionPattern with optional field overrides
 */
export const fakeTransactionPattern = (
  overrides: Partial<TransactionPattern> = {},
): TransactionPattern => {
  return {
    accountId: faker.string.uuid(),
    categoryId: faker.string.uuid(),
    ...overrides,
  };
};
