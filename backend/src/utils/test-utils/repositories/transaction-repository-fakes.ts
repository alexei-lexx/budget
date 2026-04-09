import { faker } from "@faker-js/faker";
import { TransactionType } from "../../../models/transaction";
import { CreateTransactionInput } from "../../../services/ports/transaction-repository";
import { toDateString } from "../../../types/date";

export const fakeCreateTransactionInput = (
  overrides: Partial<CreateTransactionInput> = {},
): CreateTransactionInput => {
  const type =
    overrides.type ??
    faker.helpers.arrayElement([
      TransactionType.EXPENSE,
      TransactionType.INCOME,
      TransactionType.REFUND,
      TransactionType.TRANSFER_IN,
      TransactionType.TRANSFER_OUT,
    ]);
  const transferId = Object.hasOwn(overrides, "transferId")
    ? overrides.transferId
    : type === TransactionType.TRANSFER_IN ||
        type === TransactionType.TRANSFER_OUT
      ? faker.string.uuid()
      : undefined;

  return {
    userId: faker.string.uuid(),
    accountId: faker.string.uuid(),
    categoryId: faker.string.uuid(),
    type: type,
    amount: faker.number.float({ min: 1, max: 1000, fractionDigits: 2 }),
    currency: "USD",
    date: toDateString(faker.date.recent().toISOString().split("T")[0]),
    description: faker.finance.transactionDescription(),
    transferId,
    ...overrides,
  };
};
