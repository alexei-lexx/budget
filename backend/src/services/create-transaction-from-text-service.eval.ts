import { faker } from "@faker-js/faker";
import { ReActAgent } from "../agents/react-agent";
import { CategoryType } from "../models/category";
import { TransactionType } from "../models/transaction";
import { DynAccountRepository } from "../repositories/dyn-account-repository";
import { DynCategoryRepository } from "../repositories/dyn-category-repository";
import { DynTransactionRepository } from "../repositories/dyn-transaction-repository";
import { DynUserRepository } from "../repositories/dyn-user-repository";
import { createBedrockChatModel } from "../utils/bedrock";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import { truncateTable } from "../utils/test-utils/dynamodb-helpers";
import { EvalTask, runEvalSuite } from "../utils/test-utils/evals";
import {
  fakeAccount,
  fakeCategory,
  fakeCreateTransactionInput,
  fakeUser,
} from "../utils/test-utils/factories";
import { CreateTransactionFromTextService } from "./create-transaction-from-text-service";
import { TransactionService } from "./transaction-service";

const accountRepository: DynAccountRepository = new DynAccountRepository();
const categoryRepository: DynCategoryRepository = new DynCategoryRepository();
const transactionRepository: DynTransactionRepository =
  new DynTransactionRepository();
const userRepository: DynUserRepository = new DynUserRepository();

const agent = new ReActAgent(createBedrockChatModel());

const transactionService = new TransactionService(
  accountRepository,
  categoryRepository,
  transactionRepository,
);

const service: CreateTransactionFromTextService =
  new CreateTransactionFromTextService({
    accountRepository,
    categoryRepository,
    transactionRepository,
    agent,
    transactionService,
  });

async function cleanupTables() {
  const client = createDynamoDBDocumentClient();
  const tables = [
    process.env.ACCOUNTS_TABLE_NAME || "",
    process.env.CATEGORIES_TABLE_NAME || "",
    process.env.TRANSACTIONS_TABLE_NAME || "",
  ];

  for (const tableName of tables) {
    await truncateTable(client, tableName, {
      partitionKey: "userId",
      sortKey: "id",
    });
  }

  await truncateTable(client, process.env.USERS_TABLE_NAME || "", {
    partitionKey: "id",
  });
}

const evalTasks: EvalTask<unknown>[] = [
  {
    name: "decline when no accounts",
    run: async (iteration) => {
      await cleanupTables();

      const user = await userRepository.create(fakeUser());
      const text = `bought apples for ${10 + iteration} euro`;
      const result = await service.call({ userId: user.id, text });

      return {
        input: text,
        grades: [
          {
            name: "declined",
            value: !result.success,
          },
          {
            name: "correct error message",
            value:
              !result.success &&
              result.error.message.includes(
                "Agent did not attempt to create a transaction",
              ),
          },
        ],
      };
    },
  },
  {
    name: "decline when cannot infer amount",
    run: async () => {
      await cleanupTables();

      const user = await userRepository.create(fakeUser());
      await accountRepository.create(fakeAccount({ userId: user.id }));

      const text = `bought ${faker.food.fruit()}`;
      const result = await service.call({ userId: user.id, text });

      return {
        input: text,
        grades: [
          {
            name: "declined",
            value: !result.success,
          },
          {
            name: "correct error message",
            value:
              !result.success &&
              result.error.message.includes(
                "Agent did not attempt to create a transaction",
              ),
          },
        ],
      };
    },
  },
  {
    name: "create expense transaction",
    run: async (iteration) => {
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

      const result = await service.call({ userId: user.id, text });

      return {
        input: text,
        grades: [
          {
            name: "correct type",
            value:
              result.success &&
              result.data.transaction.type === TransactionType.EXPENSE,
          },
          {
            name: "correct account",
            value:
              result.success &&
              result.data.transaction.accountId === account.id,
          },
          {
            name: "correct category",
            value:
              result.success &&
              result.data.transaction.categoryId === category.id,
          },
          {
            name: "correct amount",
            value:
              result.success &&
              result.data.transaction.amount === 10 + iteration,
          },
        ],
      };
    },
  },
  {
    name: "create income transaction",
    run: async (iteration) => {
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

      const result = await service.call({ userId: user.id, text });

      return {
        input: text,
        grades: [
          {
            name: "correct type",
            value:
              result.success &&
              result.data.transaction.type === TransactionType.INCOME,
          },
          {
            name: "correct account",
            value:
              result.success &&
              result.data.transaction.accountId === account.id,
          },
          {
            name: "correct category",
            value:
              result.success &&
              result.data.transaction.categoryId === category.id,
          },
          {
            name: "correct amount",
            value:
              result.success &&
              result.data.transaction.amount === 1000 + iteration,
          },
        ],
      };
    },
  },
  {
    name: "create refund transaction",
    run: async (iteration) => {
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

      const result = await service.call({ userId: user.id, text });

      return {
        input: text,
        grades: [
          {
            name: "correct type",
            value:
              result.success &&
              result.data.transaction.type === TransactionType.REFUND,
          },
          {
            name: "correct account",
            value:
              result.success &&
              result.data.transaction.accountId === account.id,
          },
          {
            name: "correct category",
            value:
              result.success &&
              result.data.transaction.categoryId === category.id,
          },
          {
            name: "correct amount",
            value:
              result.success &&
              result.data.transaction.amount === 50 + iteration,
          },
        ],
      };
    },
  },
  {
    name: "use amount as transcribed when no similar transaction history exists",
    run: async () => {
      await cleanupTables();

      const user = await userRepository.create(fakeUser());

      await accountRepository.create(
        fakeAccount({ userId: user.id, currency: "EUR" }),
      );

      const text = `${faker.food.dish()} 987`; //spoken as nine eighty-seven

      const result = await service.call({
        userId: user.id,
        text,
        isVoiceInput: true,
      });

      return {
        input: text,
        grades: [
          {
            name: "correct amount",
            value: result.success && result.data.transaction.amount === 987,
          },
        ],
      };
    },
  },
  {
    name: "correct collapsed amount when similar transaction history suggests a much smaller price",
    run: async () => {
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

      const text = `${faker.food.dish()} 987`; //spoken as nine eighty-seven

      const result = await service.call({
        userId: user.id,
        text,
        isVoiceInput: true,
      });

      return {
        input: text,
        grades: [
          {
            name: "corrected amount",
            value: result.success && result.data.transaction.amount === 9.87,
          },
        ],
      };
    },
  },
];

(async () => {
  const results = await runEvalSuite(evalTasks);
  let failed = 0;
  let totalErrors = 0;

  for (const { evalTaskName, avgGrade, errors, success } of results) {
    totalErrors += errors;

    if (success) {
      console.log(
        `[SUCCESS] Eval task: ${evalTaskName}, Average Grade: ${avgGrade.toFixed(2)}, Errors: ${errors}`,
      );
    } else {
      failed++;
      console.error(
        `[FAILURE] Eval task: ${evalTaskName}, Average Grade: ${avgGrade.toFixed(2)}, Errors: ${errors}`,
      );
    }
  }

  if (failed > 0 || totalErrors > 0) {
    console.error(
      `${failed} eval task(s) failed. ${totalErrors} error(s) occurred.`,
    );
    process.exit(1);
  } else {
    console.log("All eval tasks passed successfully.");
    process.exit(0);
  }
})();
