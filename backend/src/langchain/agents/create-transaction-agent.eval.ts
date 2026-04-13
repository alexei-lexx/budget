import { faker } from "@faker-js/faker";
import {
  resolveAccountRepository,
  resolveCategoryRepository,
  resolveCreateTransactionAgent,
  resolveTransactionRepository,
  resolveUserRepository,
} from "../../dependencies";
import { CategoryType } from "../../models/category";
import { TransactionType } from "../../models/transaction";
import { formatDateAsYYYYMMDD } from "../../utils/date";
import { createDynamoDBDocumentClient } from "../../utils/dynamo-client";
import { truncateAllTables } from "../../utils/test-utils/dynamodb-helpers";
import { task, toGrade } from "../../utils/test-utils/evals";
import { fakeAccount } from "../../utils/test-utils/models/account-fakes";
import { fakeCategory } from "../../utils/test-utils/models/category-fakes";
import { fakeUser } from "../../utils/test-utils/models/user-fakes";
import { fakeCreateTransactionInput } from "../../utils/test-utils/repositories/transaction-repository-fakes";
import { CREATE_TRANSACTION_TOOL_NAME } from "../tools/create-transaction";

const accountRepository = resolveAccountRepository();
const categoryRepository = resolveCategoryRepository();
const transactionRepository = resolveTransactionRepository();
const userRepository = resolveUserRepository();

const agent = resolveCreateTransactionAgent();

async function cleanupTables() {
  const client = createDynamoDBDocumentClient();
  await truncateAllTables(client);
}

async function invokeAgent(userId: string, text: string, isVoiceInput = false) {
  return agent.invoke(
    { messages: [{ role: "user", content: text }] },
    {
      context: {
        userId,
        isVoiceInput,
        today: formatDateAsYYYYMMDD(new Date()),
      },
    },
  );
}

task("decline when no accounts", async (iteration) => {
  await cleanupTables();

  const user = await userRepository.create(fakeUser());
  const text = `bought apples for ${10 + iteration} euro`;
  const response = await invokeAgent(user.id, text);

  const { toolExecutions } = response;
  const createExecution = toolExecutions.findLast(
    (execution) => execution.tool === CREATE_TRANSACTION_TOOL_NAME,
  );

  return {
    input: text,
    grades: [
      {
        name: "declined",
        value: toGrade(!createExecution),
      },
    ],
  };
});

task("decline when cannot infer amount", async () => {
  await cleanupTables();

  const user = await userRepository.create(fakeUser());
  await accountRepository.create(fakeAccount({ userId: user.id }));

  const text = `bought ${faker.food.fruit()}`;
  const response = await invokeAgent(user.id, text);

  const { toolExecutions } = response;
  const createExecution = toolExecutions.findLast(
    (execution) => execution.tool === CREATE_TRANSACTION_TOOL_NAME,
  );

  return {
    input: text,
    grades: [
      {
        name: "declined",
        value: toGrade(!createExecution),
      },
    ],
  };
});

task("create expense transaction", async (iteration) => {
  await cleanupTables();

  const user = await userRepository.create(fakeUser());
  const account = await accountRepository.create(
    fakeAccount({ userId: user.id, currency: "EUR" }),
  );
  const category = await categoryRepository.create(
    fakeCategory({
      userId: user.id,
      type: CategoryType.EXPENSE,
      name: "groceries",
    }),
  );

  const text = `bought apples for ${10 + iteration} euro`;
  const response = await invokeAgent(user.id, text);

  const { toolExecutions } = response;
  const createExecution = toolExecutions.findLast(
    (execution) => execution.tool === CREATE_TRANSACTION_TOOL_NAME,
  );
  const output = createExecution ? JSON.parse(createExecution.output) : null;

  return {
    input: text,
    grades: [
      {
        name: "correct type",
        value: toGrade(output?.data?.type === TransactionType.EXPENSE),
      },
      {
        name: "correct account",
        value: toGrade(output?.data?.accountId === account.id),
      },
      {
        name: "correct category",
        value: toGrade(output?.data?.categoryId === category.id),
      },
      {
        name: "correct amount",
        value: toGrade(output?.data?.amount === 10 + iteration),
      },
    ],
  };
});

task("create income transaction", async (iteration) => {
  await cleanupTables();

  const user = await userRepository.create(fakeUser());
  const account = await accountRepository.create(
    fakeAccount({ userId: user.id, currency: "EUR" }),
  );
  const category = await categoryRepository.create(
    fakeCategory({
      userId: user.id,
      type: CategoryType.INCOME,
      name: "salary",
    }),
  );

  const text = `received salary of ${1000 + iteration} euro`;
  const response = await invokeAgent(user.id, text);

  const { toolExecutions } = response;
  const createExecution = toolExecutions.findLast(
    (execution) => execution.tool === CREATE_TRANSACTION_TOOL_NAME,
  );
  const output = createExecution ? JSON.parse(createExecution.output) : null;

  return {
    input: text,
    grades: [
      {
        name: "correct type",
        value: toGrade(output?.data?.type === TransactionType.INCOME),
      },
      {
        name: "correct account",
        value: toGrade(output?.data?.accountId === account.id),
      },
      {
        name: "correct category",
        value: toGrade(output?.data?.categoryId === category.id),
      },
      {
        name: "correct amount",
        value: toGrade(output?.data?.amount === 1000 + iteration),
      },
    ],
  };
});

task("create refund transaction", async (iteration) => {
  await cleanupTables();

  const user = await userRepository.create(fakeUser());
  const account = await accountRepository.create(
    fakeAccount({ userId: user.id, currency: "EUR" }),
  );
  const category = await categoryRepository.create(
    fakeCategory({
      userId: user.id,
      type: CategoryType.EXPENSE,
      name: "shoes",
    }),
  );

  const text = `got a refund for shoes of ${50 + iteration} euro`;
  const response = await invokeAgent(user.id, text);

  const { toolExecutions } = response;
  const createExecution = toolExecutions.findLast(
    (execution) => execution.tool === CREATE_TRANSACTION_TOOL_NAME,
  );
  const output = createExecution ? JSON.parse(createExecution.output) : null;

  return {
    input: text,
    grades: [
      {
        name: "correct type",
        value: toGrade(output?.data?.type === TransactionType.REFUND),
      },
      {
        name: "correct account",
        value: toGrade(output?.data?.accountId === account.id),
      },
      {
        name: "correct category",
        value: toGrade(output?.data?.categoryId === category.id),
      },
      {
        name: "correct amount",
        value: toGrade(output?.data?.amount === 50 + iteration),
      },
    ],
  };
});

task(
  "use amount as transcribed when no similar transaction history exists",
  async () => {
    await cleanupTables();

    const user = await userRepository.create(fakeUser());
    await accountRepository.create(
      fakeAccount({ userId: user.id, currency: "EUR" }),
    );

    const text = `${faker.food.dish()} 987`; // spoken as nine eighty-seven
    const response = await invokeAgent(user.id, text, true);

    const { toolExecutions } = response;
    const createExecution = toolExecutions.findLast(
      (execution) => execution.tool === CREATE_TRANSACTION_TOOL_NAME,
    );
    const output = createExecution ? JSON.parse(createExecution.output) : null;

    return {
      input: text,
      grades: [
        {
          name: "correct amount",
          value: toGrade(output?.data?.amount === 987),
        },
      ],
    };
  },
);

task(
  "correct collapsed amount when similar transaction history suggests a much smaller price",
  async () => {
    await cleanupTables();

    const user = await userRepository.create(fakeUser());
    const account = await accountRepository.create(
      fakeAccount({ userId: user.id, currency: "EUR" }),
    );
    const category = await categoryRepository.create(
      fakeCategory({
        userId: user.id,
        type: CategoryType.EXPENSE,
        name: "food",
      }),
    );

    // Create similar transaction history with smaller amount
    await transactionRepository.createMany([
      fakeCreateTransactionInput({
        userId: user.id,
        accountId: account.id,
        categoryId: category.id,
        amount: 5,
        type: TransactionType.EXPENSE,
      }),
      fakeCreateTransactionInput({
        userId: user.id,
        accountId: account.id,
        categoryId: category.id,
        amount: 15,
        type: TransactionType.EXPENSE,
      }),
    ]);

    const text = `${faker.food.dish()} 987`; // spoken as nine eighty-seven
    const response = await invokeAgent(user.id, text, true);

    const { toolExecutions } = response;
    const createExecution = toolExecutions.findLast(
      (execution) => execution.tool === CREATE_TRANSACTION_TOOL_NAME,
    );
    const output = createExecution ? JSON.parse(createExecution.output) : null;

    return {
      input: text,
      grades: [
        {
          name: "corrected amount",
          value: toGrade(output?.data?.amount === 9.87),
        },
      ],
    };
  },
);
