import {
  resolveAccountRepository,
  resolveInsightService,
  resolveTransactionRepository,
  resolveUserRepository,
} from "../../dependencies";
import { TransactionType } from "../../models/transaction";
import { toDateString } from "../../types/date";
import { createDynamoDBDocumentClient } from "../../utils/dynamo-client";
import { truncateAllTables } from "../../utils/test-utils/dynamodb-helpers";
import { task, toGrade } from "../../utils/test-utils/evals";
import { fakeAccount } from "../../utils/test-utils/models/account";
import { fakeUser } from "../../utils/test-utils/models/user";
import { fakeCreateTransactionInput } from "../../utils/test-utils/repositories/transaction-repository";

const accountRepository = resolveAccountRepository();
const transactionRepository = resolveTransactionRepository();
const userRepository = resolveUserRepository();

const service = resolveInsightService();

async function cleanupTables() {
  const client = createDynamoDBDocumentClient();
  await truncateAllTables(client);
}

task("calculate total expenses for a given month", async (iteration) => {
  await cleanupTables();

  const year = 2000 + iteration; // Vary the year based on the iteration to ensure different data for each run

  const user = await userRepository.create(fakeUser());
  const account = await accountRepository.create(
    fakeAccount({ userId: user.id, currency: "EUR" }),
  );
  await transactionRepository.createMany([
    // January transactions
    fakeCreateTransactionInput({
      userId: user.id,
      accountId: account.id,
      amount: 100,
      type: TransactionType.EXPENSE,
      date: toDateString(`${year}-01-10`),
    }),
    fakeCreateTransactionInput({
      userId: user.id,
      accountId: account.id,
      amount: 150,
      type: TransactionType.EXPENSE,
      date: toDateString(`${year}-01-20`),
    }),
    // February transactions
    fakeCreateTransactionInput({
      userId: user.id,
      accountId: account.id,
      amount: 110.36,
      type: TransactionType.EXPENSE,
      date: toDateString(`${year}-02-10`),
    }),
    fakeCreateTransactionInput({
      userId: user.id,
      accountId: account.id,
      amount: 150.48,
      type: TransactionType.EXPENSE,
      date: toDateString(`${year}-02-15`),
    }),
    // March transactions
    fakeCreateTransactionInput({
      userId: user.id,
      accountId: account.id,
      amount: 120,
      type: TransactionType.EXPENSE,
      date: toDateString(`${year}-03-05`),
    }),
    fakeCreateTransactionInput({
      userId: user.id,
      accountId: account.id,
      amount: 130,
      type: TransactionType.EXPENSE,
      date: toDateString(`${year}-03-25`),
    }),
  ]);

  const question = `How much did I spend in February ${year}? Return only the number.`;

  const result = await service.call(user.id, { question });

  return {
    input: question,
    grades: [
      {
        name: "correct total",
        value: toGrade(result.success && result.data.answer.includes("260.84")),
      },
    ],
  };
});
