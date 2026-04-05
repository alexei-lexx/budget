import { jest } from "@jest/globals";
import { UserRepository } from "../../../services/ports/user-repository";

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
