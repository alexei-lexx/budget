import { faker } from "@faker-js/faker";
import {
  CreateCompoundTransactionServiceInput,
  CreateTransactionServiceInput,
} from "../../../services/transaction-service";
import { dateToDateString } from "../../../types/date-string";

export function fakeCreateTransactionServiceInput(
  overrides: Partial<CreateTransactionServiceInput> = {},
): CreateTransactionServiceInput {
  return {
    accountId: faker.string.uuid(),
    categoryId: faker.string.uuid(),
    type: "EXPENSE",
    amount: faker.number.float({ min: 1, max: 1000, fractionDigits: 2 }),
    date: dateToDateString(faker.date.recent()),
    description: faker.commerce.product(),
    ...overrides,
  };
}

export function fakeCreateCompoundTransactionServiceInput(
  overrides: Partial<CreateCompoundTransactionServiceInput> = {},
  legCount = 2,
): CreateCompoundTransactionServiceInput {
  const legs =
    overrides.legs ??
    Array.from({ length: legCount }, () => ({
      amount: faker.number.int({ min: 1, max: 100 }),
      categoryId: faker.string.uuid(),
      description: faker.commerce.product(),
    }));

  const expectedTotal = legs.reduce((sum, leg) => sum + leg.amount, 0);

  return {
    accountId: faker.string.uuid(),
    date: dateToDateString(faker.date.recent()),
    type: faker.helpers.arrayElement(["EXPENSE", "INCOME", "REFUND"]),
    expectedTotal,
    legs,
    ...overrides,
  };
}
