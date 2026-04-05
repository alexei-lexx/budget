import { faker } from "@faker-js/faker";
import { jest } from "@jest/globals";
import { TransactionType } from "../../../models/transaction";
import {
  CreateTransactionInput,
  TransactionRepository,
} from "../../../services/ports/transaction-repository";
import { toDateString } from "../../../types/date";

/**
 * Mock transaction repository for testing
 */
export const createMockTransactionRepository =
  (): jest.Mocked<TransactionRepository> => ({
    findManyByUserIdPaginated: jest.fn(),
    findManyByUserId: jest.fn(),
    findOneById: jest.fn(),
    findManyByAccountId: jest.fn(),
    findManyByTransferId: jest.fn(),
    findManyByDescription: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    archive: jest.fn(),
    archiveMany: jest.fn(),
    hasTransactionsForAccount: jest.fn(),
    detectPatterns: jest.fn(),
  });

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
    date: toDateString(faker.date.recent().toISOString().split("T")[0]),
    description: faker.finance.transactionDescription(),
    transferId: undefined,
    ...overrides,
  };
};
