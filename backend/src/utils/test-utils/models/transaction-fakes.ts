import { faker } from "@faker-js/faker";
import { Account } from "../../../models/account";
import {
  CreateTransactionInput,
  Transaction,
  TransactionData,
  TransactionPattern,
  TransactionType,
} from "../../../models/transaction";
import { dateToDateString } from "../../../types/date-string";
import { toDateTimeString } from "../../../types/date-time-string";
import { fakeAccount } from "./account-fakes";

/**
 * Passing `account` derives accountId/currency from it (kept in sync);
 * passing accountId/currency directly is also allowed, but not both.
 */
type FakeTransactionOverrides<TOmit extends keyof TransactionData = never> =
  Partial<Omit<TransactionData, "accountId" | "currency" | TOmit>> &
    (
      | { account: Account; accountId?: never; currency?: never }
      | {
          account?: never;
          accountId?: TransactionData["accountId"];
          currency?: TransactionData["currency"];
        }
    );

/**
 * Can be called with `account` or `accountId`/`currency` (not both) in overrides.
 */
export const fakeTransaction = (
  overrides: FakeTransactionOverrides = {},
): Transaction => {
  let normalizedOverrides: Partial<TransactionData>;

  if (overrides.account) {
    const { account, ...rest } = overrides;

    normalizedOverrides = {
      accountId: account.id,
      currency: account.currency,
      ...rest,
    };
  } else {
    normalizedOverrides = {
      ...overrides,
    };
  }
  const now = toDateTimeString(new Date().toISOString());
  const type = normalizedOverrides.type ?? TransactionType.EXPENSE;
  const isTransfer =
    type === TransactionType.TRANSFER_IN ||
    type === TransactionType.TRANSFER_OUT;

  return Transaction.fromPersistence({
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    accountId: faker.string.uuid(),
    categoryId: isTransfer ? undefined : faker.string.uuid(),
    amount: faker.number.float({ min: 1, max: 1000, fractionDigits: 2 }),
    type,
    currency: faker.helpers.arrayElement(["EUR", "USD"]),
    date: dateToDateString(faker.date.recent()),
    description: faker.commerce.product(),
    transferId: isTransfer ? faker.string.uuid() : undefined,
    isArchived: false,
    // Randomized to surface tests that wrongly assume a specific version.
    version: faker.number.int({ min: 1, max: 100 }),
    createdAt: now,
    updatedAt: now,
    ...normalizedOverrides,
  });
};

export const fakeExpense = (
  overrides: FakeTransactionOverrides<"type"> = {},
): Transaction =>
  fakeTransaction({ type: TransactionType.EXPENSE, ...overrides });

export const fakeRefund = (
  overrides: FakeTransactionOverrides<"type"> = {},
): Transaction =>
  fakeTransaction({ type: TransactionType.REFUND, ...overrides });

export const fakeCreateTransactionInput = (
  overrides: Partial<CreateTransactionInput> = {},
): CreateTransactionInput => {
  const userId = overrides.userId ?? faker.string.uuid();
  const account = overrides.account ?? fakeAccount({ userId });

  return {
    userId,
    account,
    type: TransactionType.EXPENSE,
    amount: faker.number.float({ min: 1, max: 1000, fractionDigits: 2 }),
    date: dateToDateString(faker.date.recent()),
    description: faker.commerce.product(),
    ...overrides,
  };
};

export const fakeTransactionPattern = (
  overrides: Partial<TransactionPattern> = {},
): TransactionPattern => {
  return {
    accountId: faker.string.uuid(),
    categoryId: faker.string.uuid(),
    ...overrides,
  };
};
