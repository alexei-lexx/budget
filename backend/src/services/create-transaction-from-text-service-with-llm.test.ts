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
  fakeTransaction,
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
    const result = await service.call({
      userId: user.id,
      text: "apples 10 euro",
    });

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
    const result = await service.call({
      userId: user.id,
      text: "bought apples",
    });

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
    const result = await service.call({
      userId: user.id,
      text: "bought apples for 10 euro",
    });

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
    const result = await service.call({
      userId: user.id,
      text: "received salary of 2000 euro",
    });

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
    const result = await service.call({
      userId: user.id,
      text: "got a refund of 50 euro for shoes",
    });

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

  describe("voice input", () => {
    it("should use amount as transcribed when no similar transaction history exists", async () => {
      // Arrange
      await accountRepository.create(
        fakeAccount({ userId: user.id, currency: "EUR" }),
      );

      // Act
      const result = await service.call({
        userId: user.id,
        text: "coffee 435", //spoken as four thirty-five
        isVoiceInput: true,
      });

      // Assert
      expect(result).toMatchObject({
        success: true,
        data: {
          transaction: { amount: 435 },
        },
      });
    });

    it("should correct collapsed amount when similar transaction history suggests a much smaller price", async () => {
      // Arrange
      const account = await accountRepository.create(
        fakeAccount({ userId: user.id, currency: "EUR" }),
      );
      const category = await categoryRepository.create(
        fakeCategory({
          userId: user.id,
          type: CategoryType.EXPENSE,
          name: "coffee",
        }),
      );

      // Seed past coffee transactions at ~4 EUR to establish history
      await transactionRepository.create(
        fakeTransaction({
          userId: user.id,
          accountId: account.id,
          categoryId: category.id,
          amount: 4,
          type: TransactionType.EXPENSE,
        }),
      );
      await transactionRepository.create(
        fakeTransaction({
          userId: user.id,
          accountId: account.id,
          categoryId: category.id,
          amount: 3.5,
          type: TransactionType.EXPENSE,
        }),
      );

      // Act
      const result = await service.call({
        userId: user.id,
        text: "coffee 435", //spoken as four thirty-five
        isVoiceInput: true,
      });

      // Assert
      expect(result).toMatchObject({
        success: true,
        data: {
          transaction: { amount: 4.35 },
        },
      });
    });

    it("should create transaction normally when voice amount is unambiguous", async () => {
      // Arrange
      await accountRepository.create(
        fakeAccount({ userId: user.id, currency: "EUR" }),
      );

      // Act
      const result = await service.call({
        userId: user.id,
        text: "coffee 4 euro",
        isVoiceInput: true,
      });

      // Assert
      expect(result).toMatchObject({
        success: true,
        data: {
          transaction: { amount: 4 },
        },
      });
    });
  });
});
