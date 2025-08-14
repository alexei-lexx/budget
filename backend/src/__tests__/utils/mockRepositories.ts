import { ITransactionRepository } from "../../models/Transaction";
import { IAccountRepository } from "../../models/Account";
import { ICategoryRepository } from "../../models/Category";

/**
 * Mock transaction repository for testing
 */
export const createMockTransactionRepository =
  (): jest.Mocked<ITransactionRepository> => ({
    findActiveByUserId: jest.fn(),
    findById: jest.fn(),
    findByAccountId: jest.fn(),
    findByTransferId: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    archive: jest.fn(),
    archiveMany: jest.fn(),
    hasTransactionsForAccount: jest.fn(),
    getAccountCategoryPatterns: jest.fn(),
  });

/**
 * Mock account repository for testing
 */
export const createMockAccountRepository =
  (): jest.Mocked<IAccountRepository> => ({
    findActiveByUserId: jest.fn(),
    findActiveById: jest.fn(),
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
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
  });
