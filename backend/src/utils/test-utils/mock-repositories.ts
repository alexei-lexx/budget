import { AccountRepository } from "../../services/ports/account-repository";
import { CategoryRepository } from "../../services/ports/category-repository";
import { TelegramBotRepository } from "../../services/ports/telegram-bot-repository";
import { TransactionRepository } from "../../services/ports/transaction-repository";
import { UserRepository } from "../../services/ports/user-repository";

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

/**
 * Mock category repository for testing
 */
export const createMockCategoryRepository =
  (): jest.Mocked<CategoryRepository> => ({
    findManyByUserId: jest.fn(),
    findManyWithArchivedByUserId: jest.fn(),
    findOneById: jest.fn(),
    findManyWithArchivedByIds: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
  });

/**
 * Mock user repository for testing
 */
export const createMockUserRepository = (): jest.Mocked<UserRepository> => ({
  findOneByEmail: jest.fn(),
  findOneById: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  ensureUser: jest.fn(),
  update: jest.fn(),
});

/**
 * Mock telegram bot repository for testing
 */
export const createMockTelegramBotRepository =
  (): jest.Mocked<TelegramBotRepository> => ({
    findOneConnectedByUserId: jest.fn(),
    findOneConnectedByWebhookSecret: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
  });
