import { faker } from "@faker-js/faker";
import { TransactionType } from "../../../models/transaction";
import { CreateTransactionServiceInput } from "../../../services/transaction-service";
import { daysAgo, localTodayDateString } from "../../date";

export const fakeCreateTransactionServiceInput = (
  overrides: Partial<CreateTransactionServiceInput> = {},
): CreateTransactionServiceInput => {
  return {
    accountId: faker.string.uuid(),
    categoryId: faker.string.uuid(),
    type: TransactionType.EXPENSE,
    amount: faker.number.float({ min: 1, max: 1000, fractionDigits: 2 }),
    date: daysAgo(
      localTodayDateString(),
      faker.number.int({ min: 0, max: 30 }),
    ),
    description: faker.commerce.product(),
    ...overrides,
  };
};
