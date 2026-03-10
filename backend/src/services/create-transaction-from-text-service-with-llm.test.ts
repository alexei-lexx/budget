import { ReActAgent } from "../agents/react-agent";
import { CategoryType } from "../models/category";
import { TransactionType } from "../models/transaction";
import { User } from "../models/user";
import { AccountRepository } from "../repositories/account-repository";
import { CategoryRepository } from "../repositories/category-repository";
import { TransactionRepository } from "../repositories/transaction-repository";
import { UserRepository } from "../repositories/user-repository";
import { createBedrockChatModel } from "../utils/bedrock";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import { truncateTable } from "../utils/test-utils/dynamodb-helpers";
import {
  fakeAccount,
  fakeCategory,
  fakeUser,
} from "../utils/test-utils/factories";
import { AgentDataService } from "./agent-data-service";
import { CreateTransactionFromTextService } from "./create-transaction-from-text-service";
import { TransactionService } from "./transaction-service";

// Disable LLM tests by default to avoid accidental execution,
// as they can be slow and may incur costs
const describeLLM = process.env.RUN_LLM_TESTS === "1" ? describe : describe.skip;

// Use [LLM] prefix to separate tests that require LLM from regular tests
describeLLM("[LLM] CreateTransactionFromTextService", () => {
  const client = createDynamoDBDocumentClient();
  const accountRepository = new AccountRepository(client);
  const categoryRepository = new CategoryRepository(client);
  const transactionRepository = new TransactionRepository(client);
  const userRepository = new UserRepository(client);

  const agentDataService = new AgentDataService(
    accountRepository,
    categoryRepository,
    transactionRepository,
  );

  const transactionService = new TransactionService(
    accountRepository,
    categoryRepository,
    transactionRepository,
  );

  const model = createBedrockChatModel();
  const agent = new ReActAgent(model);

  const service = new CreateTransactionFromTextService({
    agentDataService,
    agent,
    transactionService,
  });

  let user: User;

  beforeEach(async () => {
    // Clean up tables before each test

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

    user = await userRepository.create(fakeUser());
  });

  it("should should decline if there are no accounts", async () => {
    // Act
    const promise = service.call(user.id, "apples 10 euro");

    // Assert
    await expect(promise).rejects.toThrow(
      /Agent did not attempt to create a transaction/,
    );
  });

  it("should decline if cannot infer amount", async () => {
    // Arrange
    await accountRepository.create(fakeAccount({ userId: user.id }));

    // Act
    const promise = service.call(user.id, "bought apples");

    // Assert
    await expect(promise).rejects.toThrow(
      /Agent did not attempt to create a transaction/,
    );
  });

  it("should create expense transaction", async () => {
    // Arrange
    const account = await accountRepository.create(
      fakeAccount({ userId: user.id }),
    );
    const category = await categoryRepository.create(
      fakeCategory({
        userId: user.id,
        type: CategoryType.EXPENSE,
        name: "groceries",
      }),
    );

    // Act
    const promise = service.call(user.id, "bought apples for 10 euro");

    // Assert
    await expect(promise).resolves.toMatchObject({
      accountId: account.id,
      categoryId: category.id,
      amount: 10,
      type: TransactionType.EXPENSE,
    });
  });

  it("should create income transaction", async () => {
    // Arrange
    const account = await accountRepository.create(
      fakeAccount({ userId: user.id }),
    );
    const category = await categoryRepository.create(
      fakeCategory({
        userId: user.id,
        type: CategoryType.INCOME,
        name: "salary",
      }),
    );

    // Act
    const promise = service.call(user.id, "received salary of 2000 euro");

    // Assert
    await expect(promise).resolves.toMatchObject({
      accountId: account.id,
      categoryId: category.id,
      amount: 2000,
      type: TransactionType.INCOME,
    });
  });

  it("should create refund transaction", async () => {
    // Arrange
    const account = await accountRepository.create(
      fakeAccount({ userId: user.id }),
    );
    const category = await categoryRepository.create(
      fakeCategory({
        userId: user.id,
        type: CategoryType.EXPENSE,
        name: "wear",
      }),
    );

    // Act
    const promise = service.call(user.id, "got a refund of 50 euro for shoes");

    // Assert
    await expect(promise).resolves.toMatchObject({
      accountId: account.id,
      categoryId: category.id,
      amount: 50,
      type: TransactionType.REFUND,
    });
  });
});
