import { faker } from "@faker-js/faker";
import { jest } from "@jest/globals";
import {
  CreateUserInput,
  UserRepository,
} from "../../../services/ports/user-repository";

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

export const fakeCreateUserInput = (
  overrides: Partial<CreateUserInput> = {},
): CreateUserInput => {
  return {
    email: faker.internet.email().toLowerCase(),
    ...overrides,
  };
};
