import { faker } from "@faker-js/faker";
import { Temporal } from "temporal-polyfill";
import { TransactionType } from "../../../models/transaction";
import { CreateTransactionServiceInput } from "../../../services/transaction-service";
import { toDateString } from "../../../types/date-string";

export const fakeCreateTransactionServiceInput = (
  overrides: Partial<CreateTransactionServiceInput> = {},
): CreateTransactionServiceInput => {
  return {
    accountId: faker.string.uuid(),
    categoryId: faker.string.uuid(),
    type: TransactionType.EXPENSE,
    amount: faker.number.float({ min: 1, max: 1000, fractionDigits: 2 }),
    date: toDateString(
      Temporal.Instant.fromEpochMilliseconds(faker.date.recent().getTime())
        .toZonedDateTimeISO("UTC")
        .toPlainDate()
        .toString(),
    ),
    description: faker.commerce.product(),
    ...overrides,
  };
};
