import { faker } from "@faker-js/faker";
import { CreateUserInput, User, UserData } from "../../../models/user";

export const fakeUser = (overrides: Partial<UserData> = {}): User => {
  const now = new Date().toISOString();
  return User.fromPersistence({
    id: faker.string.uuid(),
    email: faker.internet.email().toLowerCase(),
    mcpToken: faker.string.uuid(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
};

export const fakeCreateUserInput = (
  overrides: Partial<CreateUserInput> = {},
): CreateUserInput => {
  return {
    email: faker.internet.email().toLowerCase(),
    ...overrides,
  };
};
