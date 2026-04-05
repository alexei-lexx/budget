import { faker } from "@faker-js/faker";
import { TransactionType } from "../../../models/transaction";
import {
  CreateTransactionInput,
} from "../../../services/ports/transaction-repository";
import { toDateString } from "../../../types/date";

export const fakeCreateTransactionInput = (
  overrides: Partial<CreateTransactionInput> = {},
): CreateTransactionInput => {
  return {
    userId: faker.string.uuid(),
    accountId: faker.string.uuid(),
    categoryId: faker.string.uuid(),
    type: TransactionType.EXPENSE,
    amount: faker.number.float({ min: 1, max: 1000, fractionDigits: 2 }),
    currency: "USD",
    date: toDateString(faker.date.recent().toISOString().split("T")[0]),
    description: faker.finance.transactionDescription(),
    transferId: undefined,
    ...overrides,
  };
};
