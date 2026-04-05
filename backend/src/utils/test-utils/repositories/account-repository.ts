import { faker } from "@faker-js/faker";
import { jest } from "@jest/globals";
import {
  AccountRepository,
  CreateAccountInput,
} from "../../../services/ports/account-repository";

/**
 * Mock account repository for testing
 */
export const createMockAccountRepository =
  (): jest.Mocked<AccountRepository> => ({
    findManyByUserId: jest.fn(),
    findManyWithArchivedByUserId: jest.fn(),
    findOneById: jest.fn(),
    findManyWithArchivedByIds: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
  });

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
