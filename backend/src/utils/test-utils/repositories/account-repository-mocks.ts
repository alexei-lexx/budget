import { jest } from "@jest/globals";
import { AccountRepository } from "../../../ports/account-repository";

/**
 * Mock account repository for testing
 */
export const createMockAccountRepository =
  (): jest.Mocked<AccountRepository> => ({
    findOneById: jest.fn(),
    findOneWithArchivedById: jest.fn(),
    findManyByUserId: jest.fn(),
    findManyWithArchivedByIds: jest.fn(),
    findManyWithArchivedByUserId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  });
