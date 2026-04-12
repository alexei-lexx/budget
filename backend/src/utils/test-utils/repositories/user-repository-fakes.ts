import { faker } from "@faker-js/faker";
import { CreateUserInput } from "../../../ports/user-repository";

export const fakeCreateUserInput = (
  overrides: Partial<CreateUserInput> = {},
): CreateUserInput => {
  return {
    email: faker.internet.email().toLowerCase(),
    ...overrides,
  };
};
