import { jest } from "@jest/globals";
import { AccountRepository } from "../../../ports/account-repository";

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
