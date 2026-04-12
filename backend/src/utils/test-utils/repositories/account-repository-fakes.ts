import { faker } from "@faker-js/faker";
import { CreateAccountInput } from "../../../ports/account-repository";

export const fakeCreateAccountInput = (
  overrides: Partial<CreateAccountInput> = {},
): CreateAccountInput => {
  return {
    userId: faker.string.uuid(),
    name: `${faker.finance.accountName()}-${faker.string.uuid()}`, // Ensure uniqueness
    currency: "USD",
    initialBalance: faker.number.int({ min: 0, max: 10000 }),
    ...overrides,
  };
};
