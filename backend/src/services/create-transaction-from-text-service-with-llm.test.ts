import { ReActAgent } from "../agents/react-agent";
import { CategoryType } from "../models/category";
import { TransactionType } from "../models/transaction";
import { User } from "../models/user";
import { DynAccountRepository } from "../repositories/dyn-account-repository";
import { DynCategoryRepository } from "../repositories/dyn-category-repository";
import { DynTransactionRepository } from "../repositories/dyn-transaction-repository";
import { DynUserRepository } from "../repositories/dyn-user-repository";
import { createBedrockChatModel } from "../utils/bedrock";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import { truncateTable } from "../utils/test-utils/dynamodb-helpers";
import {
  fakeAccount,
  fakeCategory,
  fakeUser,
} from "../utils/test-utils/factories";
import { CreateTransactionFromTextService } from "./create-transaction-from-text-service";
import { TransactionService } from "./transaction-service";

// Disable LLM tests by default to avoid accidental execution,
// as they can be slow and may incur costs
const describeLLM =
  process.env.RUN_LLM_TESTS === "1" ? describe : describe.skip;

// Use [LLM] prefix to separate tests that require LLM from regular tests
describeLLM("[LLM] CreateTransactionFromTextService", () => {
  let accountRepository: DynAccountRepository;
  let categoryRepository: DynCategoryRepository;
  let transactionRepository: DynTransactionRepository;
  let userRepository: DynUserRepository;
  let service: CreateTransactionFromTextService;
  let user: User;

  beforeAll(async () => {
    accountRepository = new DynAccountRepository();
    categoryRepository = new DynCategoryRepository();
    transactionRepository = new DynTransactionRepository();
    userRepository = new DynUserRepository();

    const transactionService = new TransactionService(
      accountRepository,
      categoryRepository,
      transactionRepository,
    );

    const model = createBedrockChatModel();
    const agent = new ReActAgent(model);

    service = new CreateTransactionFromTextService({
      accountRepository,
      categoryRepository,
      transactionRepository,
      agent,
      transactionService,
    });
  });

  beforeEach(async () => {
    // Clean up tables before each test
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

    user = await userRepository.create(fakeUser());
  });

  it("should decline if there are no accounts", async () => {
    // Act
    const result = await service.call(user.id, "apples 10 euro");

    // Assert
    expect(result).toMatchObject({
      success: false,
      error: {
        message: expect.stringContaining(
          "Agent did not attempt to create a transaction",
        ),
      },
    });
  });

  it("should decline if cannot infer amount", async () => {
    // Arrange
    await accountRepository.create(fakeAccount({ userId: user.id }));

    // Act
    const result = await service.call(user.id, "bought apples");

    // Assert
    expect(result).toMatchObject({
      success: false,
      error: {
        message: expect.stringContaining(
          "Agent did not attempt to create a transaction",
        ),
      },
    });
  });

  it("should create expense transaction", async () => {
    // Arrange
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

    // Act
    const result = await service.call(user.id, "bought apples for 10 euro");

    // Assert
    expect(result).toMatchObject({
      success: true,
      data: {
        transaction: {
          accountId: account.id,
          categoryId: category.id,
          amount: 10,
          type: TransactionType.EXPENSE,
        },
      },
    });
  });

  it("should create income transaction", async () => {
    // Arrange
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

    // Act
    const result = await service.call(user.id, "received salary of 2000 euro");

    // Assert
    expect(result).toMatchObject({
      success: true,
      data: {
        transaction: {
          accountId: account.id,
          categoryId: category.id,
          amount: 2000,
          type: TransactionType.INCOME,
        },
      },
    });
  });

  it("should create refund transaction", async () => {
    // Arrange
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

    // Act
    const result = await service.call(
      user.id,
      "got a refund of 50 euro for shoes",
    );

    // Assert
    expect(result).toMatchObject({
      success: true,
      data: {
        transaction: {
          accountId: account.id,
          categoryId: category.id,
          amount: 50,
          type: TransactionType.REFUND,
        },
      },
    });
  });
});
