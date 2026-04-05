import { faker } from "@faker-js/faker";
import { User } from "../../../models/user-fakes";

export const fakeUser = (overrides: Partial<User> = {}): User => {
  const now = new Date().toISOString();
  return {
    id: faker.string.uuid(),
    email: faker.internet.email().toLowerCase(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};
