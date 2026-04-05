import { faker } from "@faker-js/faker";
import { TransactionType } from "../../../models/transaction";
import { CreateTransactionServiceInput } from "../../../services/transaction-service-fakes";
import { toDateString } from "../../../types/date";

export const fakeCreateTransactionServiceInput = (
  overrides: Partial<CreateTransactionServiceInput> = {},
): CreateTransactionServiceInput => {
  return {
    accountId: faker.string.uuid(),
    categoryId: faker.string.uuid(),
    type: TransactionType.EXPENSE,
    amount: faker.number.float({ min: 1, max: 1000, fractionDigits: 2 }),
    date: toDateString(faker.date.recent().toISOString().split("T")[0]),
    description: faker.finance.transactionDescription(),
    ...overrides,
  };
};
