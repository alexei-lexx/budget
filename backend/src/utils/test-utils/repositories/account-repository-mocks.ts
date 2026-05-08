import { type Mocked, vi } from "vitest";
import { AccountRepository } from "../../../ports/account-repository";

/**
 * Mock account repository for testing
 */
export const createMockAccountRepository = (): Mocked<AccountRepository> => ({
  findOneById: vi.fn(),
  findOneWithArchivedById: vi.fn(),
  findManyByUserId: vi.fn(),
  findManyWithArchivedByIds: vi.fn(),
  findManyWithArchivedByUserId: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
});
