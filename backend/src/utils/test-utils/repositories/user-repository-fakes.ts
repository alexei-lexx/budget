import { faker } from "@faker-js/faker";
import { CreateUserInput } from "../../../services/ports/user-repository";

export const fakeCreateUserInput = (
  overrides: Partial<CreateUserInput> = {},
): CreateUserInput => {
  return {
    email: faker.internet.email().toLowerCase(),
    ...overrides,
  };
};
