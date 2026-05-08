import { type Mocked, vi } from "vitest";
import { TransactionRepository } from "../../../ports/transaction-repository";

/**
 * Mock transaction repository for testing
 */
export const createMockTransactionRepository =
  (): Mocked<TransactionRepository> => ({
    findManyByUserIdPaginated: vi.fn(),
    findManyByUserId: vi.fn(),
    findOneById: vi.fn(),
    findManyByAccountId: vi.fn(),
    findManyByTransferId: vi.fn(),
    findManyByDescription: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    hasTransactionsForAccount: vi.fn(),
    detectPatterns: vi.fn(),
  });
