import { type Mocked, vi } from "vitest";
import { UserRepository } from "../../../ports/user-repository";

/**
 * Mock user repository for testing
 */
export const createMockUserRepository = (): Mocked<UserRepository> => ({
  findOneByEmail: vi.fn(),
  findOneById: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  ensureUser: vi.fn(),
  update: vi.fn(),
});
