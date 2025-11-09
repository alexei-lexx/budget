import { IAccountRepository } from "../../models/Account";
import { ICategoryRepository } from "../../models/Category";
import { ITransactionRepository } from "../../models/Transaction";

/**
 * Mock transaction repository for testing
 */
export const createMockTransactionRepository =
  (): jest.Mocked<ITransactionRepository> => ({
    findActiveByUserId: jest.fn(),
    findActiveById: jest.fn(),
    findActiveByAccountId: jest.fn(),
    findActiveByTransferId: jest.fn(),
    findActiveByMonthAndType: jest.fn(),
    findActiveByDescription: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    archive: jest.fn(),
    archiveMany: jest.fn(),
    hasTransactionsForAccount: jest.fn(),
    detectPatterns: jest.fn(),
  });

/**
 * Mock account repository for testing
 */
export const createMockAccountRepository =
  (): jest.Mocked<IAccountRepository> => ({
    findActiveByUserId: jest.fn(),
    findActiveById: jest.fn(),
    findByIds: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
  });

/**
 * Mock category repository for testing
 */
export const createMockCategoryRepository =
  (): jest.Mocked<ICategoryRepository> => ({
    findActiveByUserId: jest.fn(),
    findActiveByUserIdAndType: jest.fn(),
    findActiveById: jest.fn(),
    findByIds: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
  });
