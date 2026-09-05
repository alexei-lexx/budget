import { faker } from "@faker-js/faker";
import {
  createTrajectoryLLMAsJudge,
  createTrajectoryMatchEvaluator,
} from "agentevals";
import { AIMessage, HumanMessage } from "langchain";
import { Temporal } from "temporal-polyfill";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  createChatModel,
  resolveAccountRepository,
  resolveAccountService,
  resolveCategoryRepository,
  resolveCategoryService,
  resolveTransactionRepository,
  resolveTransactionService,
  resolveUserRepository,
} from "../../dependencies";
import { CategoryType } from "../../models/category";
import { TransactionType } from "../../models/transaction";
import { dateToDateString, toDateString } from "../../types/date-string";
import { EntityScope } from "../../types/entity-scope";
import { createDynamoDBDocumentClient } from "../../utils/dynamo-client";
import { truncateAllTables } from "../../utils/test-utils/dynamodb-helpers";
import { fakeAccount } from "../../utils/test-utils/models/account-fakes";
import { fakeCategory } from "../../utils/test-utils/models/category-fakes";
import { fakeExpense } from "../../utils/test-utils/models/transaction-fakes";
import { fakeUser } from "../../utils/test-utils/models/user-fakes";
import { fakeCreateCategoryInput } from "../../utils/test-utils/repositories/category-repository-fakes";
import { CREATE_TRANSACTION_TOOL_NAME } from "../tools/create-transaction";
import { createCreateTransactionAgent } from "./create-transaction-agent";

const accountRepository = resolveAccountRepository();
const accountService = resolveAccountService();
const categoryRepository = resolveCategoryRepository();
const categoryService = resolveCategoryService();
const transactionRepository = resolveTransactionRepository();
const transactionService = resolveTransactionService();
const userRepository = resolveUserRepository();

describe("CreateTransactionAgent (evals)", () => {
  let context: { userId: string; today: string; isVoiceInput?: boolean };
  let today: string;
  let userId: string;
  let agent: ReturnType<typeof createCreateTransactionAgent>;
  let model: Awaited<ReturnType<typeof createChatModel>>;

  beforeAll(async () => {
    model = await createChatModel();
    agent = createCreateTransactionAgent({
      model,
      accountService,
      categoryService,
      transactionRepository,
      transactionService,
    });
  });

  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:11:12.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(async () => {
    await truncateAllTables(createDynamoDBDocumentClient());

    const user = fakeUser();
    await userRepository.create(user);
    userId = user.id;

    today = Temporal.Now.plainDateISO().toString();
    context = { userId, today };
  });

  it("creates expense transaction", async () => {
    // Arrange
    const account = fakeAccount({ userId, currency: "EUR" });
    await accountRepository.create(account);
    const category = await categoryRepository.create(
      fakeCreateCategoryInput({
        userId,
        type: CategoryType.EXPENSE,
        name: "groceries",
      }),
    );

    // Act
    const response = await agent.invoke(
      { messages: [new HumanMessage("bought apples for 10 euro")] },
      { context },
    );

    // Assert
    const result = await createTrajectoryMatchEvaluator({
      trajectoryMatchMode: "superset",
      toolArgsMatchOverrides: {
        [CREATE_TRANSACTION_TOOL_NAME]: [
          "accountId",
          "amount",
          "categoryId",
          "date",
          "type",
        ],
      },
    })({
      outputs: response.messages,
      referenceOutputs: [
        new AIMessage({
          tool_calls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: {
                accountId: account.id,
                amount: 10,
                categoryId: category.id,
                date: today,
                type: TransactionType.EXPENSE,
              },
              id: "create-transaction-reference-call",
            },
          ],
        }),
      ],
    });

    expect(result.score).toBe(true);
  });

  it("creates expense transaction by default", async () => {
    // Arrange
    const account = fakeAccount({ userId, currency: "EUR" });
    await accountRepository.create(account);

    // Act
    const response = await agent.invoke(
      // No explicit "bought" or "spent" verb
      { messages: [new HumanMessage("apples 10 euro")] },
      { context },
    );

    // Assert
    const result = await createTrajectoryMatchEvaluator({
      trajectoryMatchMode: "superset",
      toolArgsMatchOverrides: {
        [CREATE_TRANSACTION_TOOL_NAME]: ["type"],
      },
    })({
      outputs: response.messages,
      referenceOutputs: [
        new AIMessage({
          tool_calls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { type: TransactionType.EXPENSE },
              id: "create-transaction-reference-call",
            },
          ],
        }),
      ],
    });

    expect(result.score).toBe(true);
  });

  it("creates income transaction", async () => {
    // Arrange
    const account = fakeAccount({ userId, currency: "EUR" });
    await accountRepository.create(account);
    const category = await categoryRepository.create(
      fakeCategory({
        userId,
        type: CategoryType.INCOME,
        name: "salary",
      }),
    );

    // Act
    const response = await agent.invoke(
      { messages: [new HumanMessage("received salary of 1000 euro")] },
      { context },
    );

    // Assert
    const result = await createTrajectoryMatchEvaluator({
      trajectoryMatchMode: "superset",
      toolArgsMatchOverrides: {
        [CREATE_TRANSACTION_TOOL_NAME]: [
          "accountId",
          "amount",
          "categoryId",
          "date",
          "type",
        ],
      },
    })({
      outputs: response.messages,
      referenceOutputs: [
        new AIMessage({
          tool_calls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: {
                accountId: account.id,
                amount: 1000,
                categoryId: category.id,
                date: today,
                type: TransactionType.INCOME,
              },
              id: "create-transaction-reference-call",
            },
          ],
        }),
      ],
    });

    expect(result.score).toBe(true);
  });

  it("creates refund transaction", async () => {
    // Arrange
    const account = fakeAccount({ userId, currency: "EUR" });
    await accountRepository.create(account);
    const category = await categoryRepository.create(
      fakeCategory({
        userId,
        type: CategoryType.EXPENSE,
        name: "shoes",
      }),
    );

    // Act
    const response = await agent.invoke(
      { messages: [new HumanMessage("got a refund of 50 euro for shoes")] },
      { context },
    );

    // Assert
    const result = await createTrajectoryMatchEvaluator({
      trajectoryMatchMode: "superset",
      toolArgsMatchOverrides: {
        [CREATE_TRANSACTION_TOOL_NAME]: [
          "accountId",
          "amount",
          "categoryId",
          "date",
          "type",
        ],
      },
    })({
      outputs: response.messages,
      referenceOutputs: [
        new AIMessage({
          tool_calls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: {
                accountId: account.id,
                amount: 50,
                categoryId: category.id,
                date: today,
                type: TransactionType.REFUND,
              },
              id: "create-transaction-reference-call",
            },
          ],
        }),
      ],
    });

    expect(result.score).toBe(true);
  });

  it("fetches active accounts and active categories to create transaction", async () => {
    // Arrange
    const account = fakeAccount({ userId, currency: "EUR" });
    await accountRepository.create(account);

    // Act
    const response = await agent.invoke(
      { messages: [new HumanMessage("bought apples for 10 euro")] },
      { context },
    );

    // Assert
    const result = await createTrajectoryMatchEvaluator({
      trajectoryMatchMode: "superset",
      toolArgsMatchOverrides: {
        [CREATE_TRANSACTION_TOOL_NAME]: [],
        get_accounts: ["scope"],
        get_categories: ["scope"],
      },
    })({
      outputs: response.messages,
      referenceOutputs: [
        new AIMessage({
          tool_calls: [
            {
              name: "get_accounts",
              args: { scope: EntityScope.ACTIVE },
              id: "get-accounts-reference-call",
            },
            {
              name: "get_categories",
              args: { scope: EntityScope.ACTIVE },
              id: "get-categories-reference-call",
            },
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: {},
              id: "create-transaction-reference-call",
            },
          ],
        }),
      ],
    });

    expect(result.score).toBe(true);
  });

  describe("account inference", () => {
    it("selects account by currency", async () => {
      // Arrange
      const euroAccount = fakeAccount({ userId, currency: "EUR" });
      await accountRepository.create(euroAccount);
      const gbpAccount = fakeAccount({ userId, currency: "GBP" });
      await accountRepository.create(gbpAccount);
      const usdAccount = fakeAccount({ userId, currency: "USD" });
      await accountRepository.create(usdAccount);

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("bought apples for 50 pounds")] },
        { context },
      );

      // Assert
      const result = await createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: {
          [CREATE_TRANSACTION_TOOL_NAME]: ["accountId"],
        },
      })({
        outputs: response.messages,
        referenceOutputs: [
          new AIMessage({
            tool_calls: [
              {
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: {
                  accountId: gbpAccount.id,
                },
                id: "create-transaction-reference-call",
              },
            ],
          }),
        ],
      });

      expect(result.score).toBe(true);
    });

    it("selects account by name", async () => {
      // Arrange
      const cardAccount = fakeAccount({
        userId,
        name: "My Visa",
        currency: "EUR",
      });
      await accountRepository.create(cardAccount);
      const cashAccount = fakeAccount({
        userId,
        name: "My Cash",
        currency: "EUR",
      });
      await accountRepository.create(cashAccount);

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("bought apples for 50 in cash")] },
        { context },
      );

      // Assert
      const result = await createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: {
          [CREATE_TRANSACTION_TOOL_NAME]: ["accountId"],
        },
      })({
        outputs: response.messages,
        referenceOutputs: [
          new AIMessage({
            tool_calls: [
              {
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: {
                  accountId: cashAccount.id,
                },
                id: "create-transaction-reference-call",
              },
            ],
          }),
        ],
      });

      expect(result.score).toBe(true);
    });

    it("selects most used account for category", async () => {
      // Arrange
      const account1 = fakeAccount({ userId, currency: "EUR" });
      await accountRepository.create(account1);
      const account2 = fakeAccount({ userId, currency: "EUR" });
      await accountRepository.create(account2);
      const category = await categoryRepository.create(
        fakeCreateCategoryInput({
          userId,
          type: CategoryType.EXPENSE,
          name: "groceries",
        }),
      );
      // Create 3 purchases on account1
      for (let i = 0; i < 3; i++) {
        await transactionRepository.create(
          fakeExpense({
            userId,
            accountId: account1.id,
            categoryId: category.id,
            amount: faker.number.int({ min: 10, max: 100 }),
            date: dateToDateString(
              faker.date.recent({ days: { min: 1, max: 30 } }),
            ),
          }),
        );
      }
      // Create 5 purchases on account2
      for (let i = 0; i < 5; i++) {
        await transactionRepository.create(
          fakeExpense({
            userId,
            accountId: account2.id,
            categoryId: category.id,
            amount: faker.number.int({ min: 10, max: 100 }),
            date: dateToDateString(
              faker.date.recent({ days: { min: 1, max: 30 } }),
            ),
          }),
        );
      }

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("bought apples for 50 euro")] },
        { context },
      );

      // Assert
      const result = await createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: {
          [CREATE_TRANSACTION_TOOL_NAME]: ["accountId"],
        },
      })({
        outputs: response.messages,
        referenceOutputs: [
          new AIMessage({
            tool_calls: [
              {
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: {
                  accountId: account2.id,
                },
                id: "create-transaction-reference-call",
              },
            ],
          }),
        ],
      });

      expect(result.score).toBe(true);
    });

    it("selects most used account overall", async () => {
      // Arrange
      const account1 = fakeAccount({ userId, currency: "EUR" });
      await accountRepository.create(account1);
      const account2 = fakeAccount({ userId, currency: "EUR" });
      await accountRepository.create(account2);

      // Create 3 purchases on account1
      for (let i = 0; i < 3; i++) {
        await transactionRepository.create(
          fakeExpense({
            userId,
            accountId: account1.id,
            amount: faker.number.int({ min: 10, max: 100 }),
            date: dateToDateString(
              faker.date.recent({ days: { min: 1, max: 30 } }),
            ),
          }),
        );
      }
      // Create 5 purchases on account2
      for (let i = 0; i < 5; i++) {
        await transactionRepository.create(
          fakeExpense({
            userId,
            accountId: account2.id,
            amount: faker.number.int({ min: 10, max: 100 }),
            date: dateToDateString(
              faker.date.recent({ days: { min: 1, max: 30 } }),
            ),
          }),
        );
      }

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("bought apples for 50 euro")] },
        { context },
      );

      // Assert
      const result = await createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: {
          [CREATE_TRANSACTION_TOOL_NAME]: ["accountId"],
        },
      })({
        outputs: response.messages,
        referenceOutputs: [
          new AIMessage({
            tool_calls: [
              {
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: {
                  accountId: account2.id,
                },
                id: "create-transaction-reference-call",
              },
            ],
          }),
        ],
      });

      expect(result.score).toBe(true);
    });
  });

  describe("category inference", () => {
    it("selects category by name signal", async () => {
      // Arrange
      const account = fakeAccount({ userId, currency: "EUR" });
      await accountRepository.create(account);
      const electronics = await categoryRepository.create(
        fakeCreateCategoryInput({
          userId,
          type: CategoryType.EXPENSE,
          name: "electronics",
        }),
      );
      await categoryRepository.create(
        fakeCreateCategoryInput({
          userId,
          type: CategoryType.EXPENSE,
          name: "groceries",
        }),
      );
      await categoryRepository.create(
        fakeCreateCategoryInput({
          userId,
          type: CategoryType.EXPENSE,
          name: "household",
        }),
      );

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("bought headphones for 10 euro")] },
        { context },
      );

      // Assert
      const result = await createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: {
          [CREATE_TRANSACTION_TOOL_NAME]: ["categoryId"],
        },
      })({
        outputs: response.messages,
        referenceOutputs: [
          new AIMessage({
            tool_calls: [
              {
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: {
                  categoryId: electronics.id,
                },
                id: "create-transaction-reference-call",
              },
            ],
          }),
        ],
      });

      expect(result.score).toBe(true);
    });

    it("selects category by similar transactions", async () => {
      // Arrange
      const account = fakeAccount({ userId, currency: "EUR" });
      await accountRepository.create(account);
      const electronics = await categoryRepository.create(
        fakeCreateCategoryInput({
          userId,
          type: CategoryType.EXPENSE,
          name: "electronics",
        }),
      );
      const household = await categoryRepository.create(
        fakeCreateCategoryInput({
          userId,
          type: CategoryType.EXPENSE,
          name: "household",
        }),
      );
      // Create 3 fruit purchases in intentionally irrelevant category: electronics
      for (let i = 0; i < 3; i++) {
        await transactionRepository.create(
          fakeExpense({
            userId,
            accountId: account.id,
            categoryId: electronics.id,
            amount: faker.number.int({ min: 10, max: 100 }),
            description: faker.food.fruit(),
            date: dateToDateString(
              faker.date.recent({ days: { min: 1, max: 30 } }),
            ),
          }),
        );
      }
      // Create 5 vegetable purchases in intentionally irrelevant category: household
      for (let i = 0; i < 5; i++) {
        await transactionRepository.create(
          fakeExpense({
            userId,
            accountId: account.id,
            categoryId: household.id,
            amount: faker.number.int({ min: 10, max: 100 }),
            description: faker.food.vegetable(),
            date: dateToDateString(
              faker.date.recent({ days: { min: 1, max: 30 } }),
            ),
          }),
        );
      }

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("bought cucumbers for 10 euro")] },
        { context },
      );

      // Assert
      const result = await createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: {
          [CREATE_TRANSACTION_TOOL_NAME]: ["categoryId"],
        },
      })({
        outputs: response.messages,
        referenceOutputs: [
          new AIMessage({
            tool_calls: [
              {
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: {
                  categoryId: household.id,
                },
                id: "create-transaction-reference-call",
              },
            ],
          }),
        ],
      });

      expect(result.score).toBe(true);
    });

    it("leaves category blank when no match", async () => {
      // Arrange
      const account = fakeAccount({ userId, currency: "EUR" });
      await accountRepository.create(account);
      await categoryRepository.create(
        fakeCreateCategoryInput({
          userId,
          type: CategoryType.EXPENSE,
          name: "electronics",
        }),
      );
      await categoryRepository.create(
        fakeCreateCategoryInput({
          userId,
          type: CategoryType.EXPENSE,
          name: "household",
        }),
      );

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("bought apples for 10 euro")] },
        { context },
      );

      // Assert
      const result = await createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: {
          [CREATE_TRANSACTION_TOOL_NAME]: ["categoryId"],
        },
      })({
        outputs: response.messages,
        referenceOutputs: [
          new AIMessage({
            tool_calls: [
              {
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: {
                  categoryId: undefined,
                },
                id: "create-transaction-reference-call",
              },
            ],
          }),
        ],
      });

      expect(result.score).toBe(true);
    });
  });

  describe("description inference", () => {
    it("produces description that only lists purchased items", async () => {
      // Arrange
      const account = fakeAccount({ userId, currency: "EUR" });
      await accountRepository.create(account);

      await categoryRepository.create(
        fakeCategory({ userId, type: CategoryType.EXPENSE, name: "shopping" }),
      );

      // Act
      const response = await agent.invoke(
        {
          messages: [
            new HumanMessage(
              "bought a used mountain bike and waterproof bike bags for 200 euros",
            ),
          ],
        },
        { context },
      );

      // Assert
      const result = await createTrajectoryLLMAsJudge({
        continuous: true,
        judge: model,
        prompt: `Description must list only the purchased items
          (a used mountain bike, waterproof bike bags),
          may contain conjunctions, and nothing else.

          Grade the following trajectory:
          <trajectory>{outputs}</trajectory>
        `.trim(),
      })({
        outputs: response.messages,
      });

      expect(result.score).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe("when amount is suspiciously high", () => {
    it("does not correct amount under voice input when no similar history exists", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId }));

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("sandwich 987")] },
        { context: { ...context, isVoiceInput: true } },
      );

      // Assert
      const result = await createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: { [CREATE_TRANSACTION_TOOL_NAME]: ["amount"] },
      })({
        outputs: response.messages,
        referenceOutputs: [
          new AIMessage({
            tool_calls: [
              {
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: { amount: 987 },
                id: "create-transaction-reference-call",
              },
            ],
          }),
        ],
      });

      expect(result.score).toBe(true);
    });

    it("corrects amount under voice input when history suggests smaller price", async () => {
      // Arrange
      const account = fakeAccount({ userId });
      await accountRepository.create(account);
      const food = await categoryRepository.create(
        fakeCreateCategoryInput({
          userId,
          type: CategoryType.EXPENSE,
          name: "food",
        }),
      );
      // Create 3 prior "food" expenses around 5–15 EUR
      for (let i = 0; i < 3; i++) {
        await transactionRepository.create(
          fakeExpense({
            userId,
            accountId: account.id,
            categoryId: food.id,
            amount: faker.number.int({ min: 5, max: 15 }),
            description: undefined,
          }),
        );
      }

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("sandwich 987")] },
        { context: { ...context, isVoiceInput: true } },
      );

      // Assert
      const result = await createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: { [CREATE_TRANSACTION_TOOL_NAME]: ["amount"] },
      })({
        outputs: response.messages,
        referenceOutputs: [
          new AIMessage({
            tool_calls: [
              {
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: { amount: 9.87 },
                id: "create-transaction-reference-call",
              },
            ],
          }),
        ],
      });

      expect(result.score).toBe(true);
    });

    it("does not correct amount under keyboard input when history suggests smaller price", async () => {
      // Arrange
      const account = fakeAccount({ userId });
      await accountRepository.create(account);
      const food = await categoryRepository.create(
        fakeCreateCategoryInput({
          userId,
          type: CategoryType.EXPENSE,
          name: "food",
        }),
      );
      // Create 3 prior "food" expenses around 5–15 EUR
      for (let i = 0; i < 3; i++) {
        await transactionRepository.create(
          fakeExpense({
            userId,
            accountId: account.id,
            categoryId: food.id,
            amount: faker.number.int({ min: 5, max: 15 }),
            description: undefined,
          }),
        );
      }

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("sandwich 987")] },
        { context: { ...context, isVoiceInput: false } },
      );

      // Assert
      const result = await createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: { [CREATE_TRANSACTION_TOOL_NAME]: ["amount"] },
      })({
        outputs: response.messages,
        referenceOutputs: [
          new AIMessage({
            tool_calls: [
              {
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: { amount: 987 },
                id: "create-transaction-reference-call",
              },
            ],
          }),
        ],
      });

      expect(result.score).toBe(true);
    });
  });

  describe("when message contains HH:MM", () => {
    it("treats bare HH:MM as price under voice input", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId }));

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("11:23")] },
        { context: { ...context, isVoiceInput: true } },
      );

      // Assert
      const result = await createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: { [CREATE_TRANSACTION_TOOL_NAME]: ["amount"] },
      })({
        outputs: response.messages,
        referenceOutputs: [
          new AIMessage({
            tool_calls: [
              {
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: { amount: 11.23 },
                id: "create-transaction-reference-call",
              },
            ],
          }),
        ],
      });

      expect(result.score).toBe(true);
    });

    it("treats HH:MM in mixed text as price under voice input", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId }));

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("groceries 7:50")] },
        { context: { ...context, isVoiceInput: true } },
      );

      // Assert
      const result = await createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: { [CREATE_TRANSACTION_TOOL_NAME]: ["amount"] },
      })({
        outputs: response.messages,
        referenceOutputs: [
          new AIMessage({
            tool_calls: [
              {
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: { amount: 7.5 },
                id: "create-transaction-reference-call",
              },
            ],
          }),
        ],
      });

      expect(result.score).toBe(true);
    });

    it("treats HH:MM as price when preposition refers to place", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId }));

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("lunch 11:23 at cafe")] },
        { context: { ...context, isVoiceInput: true } },
      );

      // Assert
      const result = await createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: { [CREATE_TRANSACTION_TOOL_NAME]: ["amount"] },
      })({
        outputs: response.messages,
        referenceOutputs: [
          new AIMessage({
            tool_calls: [
              {
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: { amount: 11.23 },
                id: "create-transaction-reference-call",
              },
            ],
          }),
        ],
      });

      expect(result.score).toBe(true);
    });

    it("prefers explicit numeric over HH:MM", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId }));

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("transferred 100 at 15:30")] },
        { context: { ...context, isVoiceInput: true } },
      );

      // Assert
      const result = await createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: { [CREATE_TRANSACTION_TOOL_NAME]: ["amount"] },
      })({
        outputs: response.messages,
        referenceOutputs: [
          new AIMessage({
            tool_calls: [
              {
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: { amount: 100 },
                id: "create-transaction-reference-call",
              },
            ],
          }),
        ],
      });

      expect(result.score).toBe(true);
    });

    it("does not create transaction when HH:MM string is clock time", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId }));

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("I brought coffee at 12:34")] },
        { context: { ...context, isVoiceInput: true } },
      );

      // Assert
      const toolNames = response.messages
        .filter(AIMessage.isInstance)
        .flatMap((message) => message.tool_calls ?? [])
        .map((toolCall) => toolCall.name);
      expect(toolNames).not.toContain(CREATE_TRANSACTION_TOOL_NAME);
    });

    it("does not create transaction for bare HH:MM under keyboard input", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId }));

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("11:23")] },
        { context },
      );

      // Assert
      const toolNames = response.messages
        .filter(AIMessage.isInstance)
        .flatMap((message) => message.tool_calls ?? [])
        .map((toolCall) => toolCall.name);
      expect(toolNames).not.toContain(CREATE_TRANSACTION_TOOL_NAME);
    });
  });

  describe("when message contains NN NN integer pair", () => {
    it("recognizes NN NN as decimal amount under voice input", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId }));

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("apples, bananas 12 54")] },
        { context: { ...context, isVoiceInput: true } },
      );

      // Assert
      const result = await createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: { [CREATE_TRANSACTION_TOOL_NAME]: ["amount"] },
      })({
        outputs: response.messages,
        referenceOutputs: [
          new AIMessage({
            tool_calls: [
              {
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: { amount: 12.54 },
                id: "create-transaction-reference-call",
              },
            ],
          }),
        ],
      });

      expect(result.score).toBe(true);
    });

    it("recognizes NN N as decimal amount with leading zero under voice input", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId }));

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("coffee 12 5")] },
        { context: { ...context, isVoiceInput: true } },
      );

      // Assert
      const result = await createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: { [CREATE_TRANSACTION_TOOL_NAME]: ["amount"] },
      })({
        outputs: response.messages,
        referenceOutputs: [
          new AIMessage({
            tool_calls: [
              {
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: { amount: 12.05 },
                id: "create-transaction-reference-call",
              },
            ],
          }),
        ],
      });

      expect(result.score).toBe(true);
    });

    it("does not create transaction under keyboard input", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId }));

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("apples, bananas 12 54")] },
        { context: { ...context, isVoiceInput: false } },
      );

      // Assert
      const toolNames = response.messages
        .filter(AIMessage.isInstance)
        .flatMap((message) => message.tool_calls ?? [])
        .map((toolCall) => toolCall.name);
      expect(toolNames).not.toContain(CREATE_TRANSACTION_TOOL_NAME);
    });
  });

  describe("when amount is not given", () => {
    it("creates transaction from recurring matches with same amount", async () => {
      // Arrange
      const account = fakeAccount({ userId, currency: "EUR" });
      await accountRepository.create(account);

      const category = await categoryRepository.create(
        fakeCreateCategoryInput({
          userId,
          type: CategoryType.EXPENSE,
        }),
      );

      // Seed recurring history — same description and amount, recorded monthly
      const todayPlainDate = Temporal.Now.plainDateISO();
      const recurringAmount = 50;
      const recurringDescription = "gym abo";
      for (const days of [10, 40, 70, 100]) {
        await transactionRepository.create(
          fakeExpense({
            userId,
            accountId: account.id,
            categoryId: category.id,
            amount: recurringAmount,
            description: recurringDescription,
            date: toDateString(todayPlainDate.subtract({ days }).toString()),
          }),
        );
      }

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("gym")] },
        { context },
      );

      // Assert
      const result = await createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: {
          [CREATE_TRANSACTION_TOOL_NAME]: [
            "accountId",
            "categoryId",
            "amount",
            "date",
            "type",
            "description",
          ],
        },
      })({
        outputs: response.messages,
        referenceOutputs: [
          new AIMessage({
            tool_calls: [
              {
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: {
                  accountId: account.id,
                  categoryId: category.id,
                  amount: recurringAmount,
                  date: today,
                  type: TransactionType.EXPENSE,
                  description: recurringDescription,
                },
                id: "create-transaction-reference-call",
              },
            ],
          }),
        ],
      });

      expect(result.score).toBe(true);
    });

    it("does not create transaction from varying-amount recurring matches", async () => {
      // Arrange
      const account = fakeAccount({ userId, currency: "EUR" });
      await accountRepository.create(account);

      const category = await categoryRepository.create(
        fakeCreateCategoryInput({
          userId,
          type: CategoryType.EXPENSE,
        }),
      );

      // Seed recurring history that disagrees on amount
      const todayPlainDate = Temporal.Now.plainDateISO();
      const recurringDescription = "gym abo";
      for (const [days, amount] of [
        [10, 20],
        [40, 35],
        [70, 47],
      ] as const) {
        await transactionRepository.create(
          fakeExpense({
            userId,
            accountId: account.id,
            categoryId: category.id,
            amount,
            description: recurringDescription,
            date: toDateString(todayPlainDate.subtract({ days }).toString()),
          }),
        );
      }

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("gym")] },
        { context },
      );

      // Assert
      const toolNames = response.messages
        .filter(AIMessage.isInstance)
        .flatMap((message) => message.tool_calls ?? [])
        .map((toolCall) => toolCall.name);
      expect(toolNames).not.toContain(CREATE_TRANSACTION_TOOL_NAME);
    });

    it("does not create transaction from single prior match", async () => {
      // Arrange
      const account = fakeAccount({ userId, currency: "EUR" });
      await accountRepository.create(account);

      const category = await categoryRepository.create(
        fakeCreateCategoryInput({
          userId,
          type: CategoryType.EXPENSE,
        }),
      );

      // Seed exactly one prior "gym abo" transaction — not a recurring pattern
      const todayPlainDate = Temporal.Now.plainDateISO();
      await transactionRepository.create(
        fakeExpense({
          userId,
          accountId: account.id,
          categoryId: category.id,
          amount: 50,
          description: "gym abo",
          date: toDateString(todayPlainDate.subtract({ days: 15 }).toString()),
        }),
      );

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("gym")] },
        { context },
      );

      // Assert
      const toolNames = response.messages
        .filter(AIMessage.isInstance)
        .flatMap((message) => message.tool_calls ?? [])
        .map((toolCall) => toolCall.name);
      expect(toolNames).not.toContain(CREATE_TRANSACTION_TOOL_NAME);
    });

    it("does not create transaction when no prior matches exist", async () => {
      // Arrange
      const account = fakeAccount({ userId, currency: "EUR" });
      await accountRepository.create(account);

      const category = await categoryRepository.create(
        fakeCategory({
          userId,
          type: CategoryType.EXPENSE,
        }),
      );

      // Seed unrelated history — no transaction described "gym"
      const todayPlainDate = Temporal.Now.plainDateISO();
      await transactionRepository.create(
        fakeExpense({
          userId,
          accountId: account.id,
          categoryId: category.id,
          amount: 50,
          date: toDateString(todayPlainDate.subtract({ days: 20 }).toString()),
        }),
      );

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("gym")] },
        { context },
      );

      // Assert
      const toolNames = response.messages
        .filter(AIMessage.isInstance)
        .flatMap((message) => message.tool_calls ?? [])
        .map((toolCall) => toolCall.name);
      expect(toolNames).not.toContain(CREATE_TRANSACTION_TOOL_NAME);
    });
  });
});
