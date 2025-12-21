import { faker } from "@faker-js/faker";
import { Account, CreateAccountInput } from "../../models/account";
import {
  Category,
  CategoryType,
  CreateCategoryInput,
} from "../../models/category";
import {
  CreateTransactionInput,
  Transaction,
  TransactionPattern,
  TransactionType,
} from "../../models/transaction";
import { CreateUserInput, User } from "../../models/user";

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

export const fakeCreateAccountInput = (
  overrides: Partial<CreateAccountInput> = {},
): CreateAccountInput => {
  return {
    userId: faker.string.uuid(),
    name: `${faker.finance.accountName()}-${faker.string.uuid()}`, // Ensure uniqueness
    currency: "USD",
    initialBalance: faker.number.int({ min: 0, max: 10000 }),
    ...overrides,
  };
};

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

export const fakeCreateCategoryInput = (
  overrides: Partial<CreateCategoryInput> = {},
): CreateCategoryInput => {
  return {
    userId: faker.string.uuid(),
    name: `${faker.commerce.department()}-${faker.string.uuid()}`, // Ensure uniqueness
    type: CategoryType.EXPENSE,
    ...overrides,
  };
};

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

export const fakeTransactionPattern = (
  overrides: Partial<TransactionPattern> = {},
): TransactionPattern => {
  return {
    accountId: faker.string.uuid(),
    categoryId: faker.string.uuid(),
    ...overrides,
  };
};

export const fakeCreateTransactionInput = (
  overrides: Partial<CreateTransactionInput> = {},
): CreateTransactionInput => {
  return {
    userId: faker.string.uuid(),
    accountId: faker.string.uuid(),
    categoryId: faker.string.uuid(),
    type: TransactionType.EXPENSE,
    amount: faker.number.float({ min: 1, max: 1000, fractionDigits: 2 }),
    currency: "USD",
    date: faker.date.recent().toISOString().split("T")[0], // YYYY-MM-DD format
    description: faker.finance.transactionDescription(),
    transferId: undefined,
    ...overrides,
  };
};

export const fakeUser = (overrides: Partial<User> = {}): User => {
  const now = new Date().toISOString();
  return {
    id: faker.string.uuid(),
    auth0UserId: `auth0|${faker.string.uuid()}`,
    email: faker.internet.email().toLowerCase(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

export const fakeCreateUserInput = (
  overrides: Partial<CreateUserInput> = {},
): CreateUserInput => {
  return {
    auth0UserId: `auth0|${faker.string.uuid()}`,
    email: faker.internet.email().toLowerCase(),
    ...overrides,
  };
};
