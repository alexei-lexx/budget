import { jest } from "@jest/globals";
import { TransactionRepository } from "../../../ports/transaction-repository";

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
