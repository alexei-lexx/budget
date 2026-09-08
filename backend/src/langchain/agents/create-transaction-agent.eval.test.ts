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
import { Category, CategoryType } from "../../models/category";
import { TransactionType } from "../../models/transaction";
import { dateToDateString, toDateString } from "../../types/date-string";
import { EntityScope } from "../../types/entity-scope";
import { createDynamoDBDocumentClient } from "../../utils/dynamo-client";
import { truncateAllTables } from "../../utils/test-utils/dynamodb-helpers";
import { fakeAccount } from "../../utils/test-utils/models/account-fakes";
import {
  fakeCategory,
  fakeCreateCategoryInput,
} from "../../utils/test-utils/models/category-fakes";
import { fakeExpense } from "../../utils/test-utils/models/transaction-fakes";
import { fakeUser } from "../../utils/test-utils/models/user-fakes";
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
    const category = Category.create(
      fakeCreateCategoryInput({
        userId,
        type: CategoryType.EXPENSE,
        name: "groceries",
      }),
    );
    await categoryRepository.create(category);

    // Act
    const response = await agent.invoke(
      { messages: [new HumanMessage("bought apples for 10 euro")] },
      { context },
    );

    // Assert
    const evaluator = createTrajectoryMatchEvaluator({
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
    });

    await expect(evaluator).toEvaluateTrue({
      outputs: response,
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
    const evaluator = createTrajectoryMatchEvaluator({
      trajectoryMatchMode: "superset",
      toolArgsMatchOverrides: {
        [CREATE_TRANSACTION_TOOL_NAME]: ["type"],
      },
    });

    await expect(evaluator).toEvaluateTrue({
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
  });

  it("creates income transaction", async () => {
    // Arrange
    const account = fakeAccount({ userId, currency: "EUR" });
    await accountRepository.create(account);
    const category = fakeCategory({
      userId,
      type: CategoryType.INCOME,
      name: "salary",
    });
    await categoryRepository.create(category);

    // Act
    const response = await agent.invoke(
      { messages: [new HumanMessage("received salary of 1000 euro")] },
      { context },
    );

    // Assert
    const evaluator = createTrajectoryMatchEvaluator({
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
    });

    await expect(evaluator).toEvaluateTrue({
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
  });

  it("creates refund transaction", async () => {
    // Arrange
    const account = fakeAccount({ userId, currency: "EUR" });
    await accountRepository.create(account);
    const category = fakeCategory({
      userId,
      type: CategoryType.EXPENSE,
      name: "shoes",
    });
    await categoryRepository.create(category);

    // Act
    const response = await agent.invoke(
      { messages: [new HumanMessage("got a refund of 50 euro for shoes")] },
      { context },
    );

    // Assert
    const evaluator = createTrajectoryMatchEvaluator({
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
    });

    await expect(evaluator).toEvaluateTrue({
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
    const evaluator = createTrajectoryMatchEvaluator({
      trajectoryMatchMode: "superset",
      toolArgsMatchOverrides: {
        [CREATE_TRANSACTION_TOOL_NAME]: [],
        get_accounts: ["scope"],
        get_categories: ["scope"],
      },
    });

    await expect(evaluator).toEvaluateTrue({
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
      const evaluator = createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: {
          [CREATE_TRANSACTION_TOOL_NAME]: ["accountId"],
        },
      });

      await expect(evaluator).toEvaluateTrue({
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
      const evaluator = createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: {
          [CREATE_TRANSACTION_TOOL_NAME]: ["accountId"],
        },
      });

      await expect(evaluator).toEvaluateTrue({
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
    });

    it("selects most used account for category", async () => {
      // Arrange
      const cash = fakeAccount({ userId, name: "cash", currency: "EUR" });
      await accountRepository.create(cash);

      const card = fakeAccount({ userId, name: "card", currency: "EUR" });
      await accountRepository.create(card);

      const groceries = Category.create(
        fakeCreateCategoryInput({
          userId,
          type: CategoryType.EXPENSE,
          name: "groceries",
        }),
      );
      await categoryRepository.create(groceries);

      const transport = Category.create(
        fakeCreateCategoryInput({
          userId,
          type: CategoryType.EXPENSE,
          name: "transport",
        }),
      );
      await categoryRepository.create(transport);

      // Create 3 groceries purchases using cash - weaker signal for groceries
      for (let i = 0; i < 3; i++) {
        await transactionRepository.create(
          fakeExpense({
            userId,
            account: cash,
            categoryId: groceries.id,
            date: dateToDateString(
              faker.date.recent({ days: { min: 1, max: 30 } }),
            ),
          }),
        );
      }
      // Create 5 transport purchases using cash - noise, unrelated category
      for (let i = 0; i < 5; i++) {
        await transactionRepository.create(
          fakeExpense({
            userId,
            account: cash,
            categoryId: transport.id,
            date: dateToDateString(
              faker.date.recent({ days: { min: 1, max: 30 } }),
            ),
          }),
        );
      }
      // Create 5 groceries purchases using card - stronger signal, expected account
      for (let i = 0; i < 5; i++) {
        await transactionRepository.create(
          fakeExpense({
            userId,
            account: card,
            categoryId: groceries.id,
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
      const evaluator = createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: {
          [CREATE_TRANSACTION_TOOL_NAME]: ["accountId"],
        },
      });

      await expect(evaluator).toEvaluateTrue({
        outputs: response.messages,
        referenceOutputs: [
          new AIMessage({
            tool_calls: [
              {
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: {
                  accountId: card.id,
                },
                id: "create-transaction-reference-call",
              },
            ],
          }),
        ],
      });
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
            account: account1,
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
            account: account2,
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
      const evaluator = createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: {
          [CREATE_TRANSACTION_TOOL_NAME]: ["accountId"],
        },
      });

      await expect(evaluator).toEvaluateTrue({
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
    });
  });

  describe("category inference", () => {
    it("selects category by name", async () => {
      // Arrange
      const account = fakeAccount({ userId, currency: "EUR" });
      await accountRepository.create(account);

      const groceries = Category.create(
        fakeCreateCategoryInput({
          userId,
          type: CategoryType.EXPENSE,
          name: "groceries",
        }),
      );
      await categoryRepository.create(groceries);

      await categoryRepository.create(
        Category.create(
          fakeCreateCategoryInput({
            userId,
            type: CategoryType.EXPENSE,
            name: "household",
          }),
        ),
      );

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("bought groceries for 10 euros")] },
        { context },
      );

      // Assert
      const evaluator = createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: {
          [CREATE_TRANSACTION_TOOL_NAME]: ["categoryId"],
        },
      });

      await expect(evaluator).toEvaluateTrue({
        outputs: response,
        referenceOutputs: [
          new AIMessage({
            tool_calls: [
              {
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: {
                  categoryId: groceries.id,
                },
                id: "create-transaction-reference-call",
              },
            ],
          }),
        ],
      });
    });

    it("selects category by signal", async () => {
      // Arrange
      const account = fakeAccount({ userId, currency: "EUR" });
      await accountRepository.create(account);

      await categoryRepository.create(
        Category.create(
          fakeCreateCategoryInput({
            userId,
            type: CategoryType.EXPENSE,
            name: "groceries",
          }),
        ),
      );

      const household = Category.create(
        fakeCreateCategoryInput({
          userId,
          type: CategoryType.EXPENSE,
          name: "household",
        }),
      );
      await categoryRepository.create(household);

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("bought detergents for 10 euro")] },
        { context },
      );

      // Assert
      const evaluator = createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: {
          [CREATE_TRANSACTION_TOOL_NAME]: ["categoryId"],
        },
      });

      await expect(evaluator).toEvaluateTrue({
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
    });

    it("leaves category blank when no match", async () => {
      // Arrange
      const account = fakeAccount({ userId, currency: "EUR" });
      await accountRepository.create(account);
      await categoryRepository.create(
        Category.create(
          fakeCreateCategoryInput({
            userId,
            type: CategoryType.EXPENSE,
            name: "electronics",
          }),
        ),
      );
      await categoryRepository.create(
        Category.create(
          fakeCreateCategoryInput({
            userId,
            type: CategoryType.EXPENSE,
            name: "household",
          }),
        ),
      );

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("bought apples for 10 euro")] },
        { context },
      );

      // Assert
      const evaluator = createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: {
          [CREATE_TRANSACTION_TOOL_NAME]: ["categoryId"],
        },
      });

      await expect(evaluator).toEvaluateTrue({
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
    });
  });

  describe("description inference", () => {
    it("produces description that only lists purchased items", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId }));

      // Act
      const response = await agent.invoke(
        {
          messages: [
            new HumanMessage(
              "bought a used mountain bike and waterproof bike bags for 200",
            ),
          ],
        },
        { context },
      );

      // Assert
      const evaluator = createTrajectoryLLMAsJudge({
        continuous: true,
        judge: model,
        prompt: `Description must list only the purchased items
          (a used mountain bike, waterproof bike bags),
          may contain conjunctions, and nothing else.

          Grade the following trajectory:
          <trajectory>{outputs}</trajectory>
        `.trim(),
      });

      await expect(evaluator).toEvaluateAtLeast(
        {
          outputs: response.messages,
        },
        0.9,
      );
    });

    it("skips description that equals category name", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId, currency: "EUR" }));
      await categoryRepository.create(
        Category.create(
          fakeCreateCategoryInput({
            userId,
            type: CategoryType.EXPENSE,
            name: "groceries",
          }),
        ),
      );

      // Act
      const response = await agent.invoke(
        {
          messages: [new HumanMessage("purchased groceries for 50 euro")],
        },
        { context },
      );

      // Assert
      const evaluator = createTrajectoryLLMAsJudge({
        continuous: true,
        judge: model,
        prompt: `Description must be empty
          because the purchased item "groceries"
          equals the category name.

          "Description: N/A" in the agent's response means an empty description.

          Grade the following trajectory:
          <trajectory>{outputs}</trajectory>
        `.trim(),
      });

      await expect(evaluator).toEvaluateAtLeast(
        {
          outputs: response.messages,
        },
        0.9,
      );
    });

    it("skips description that equals translated category name", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId, currency: "EUR" }));
      await categoryRepository.create(
        Category.create(
          fakeCreateCategoryInput({
            userId,
            type: CategoryType.EXPENSE,
            name: "groceries",
          }),
        ),
      );

      // Act
      const response = await agent.invoke(
        {
          messages: [new HumanMessage("Lebensmittel für 50 Euro gekauft")],
        },
        { context },
      );

      // Assert
      const evaluator = createTrajectoryLLMAsJudge({
        continuous: true,
        judge: model,
        prompt: `Description must be empty
          because the purchased item "groceries"
          equals the category name translated into German.

          "Description: N/A" in the agent's response means an empty description.

          Grade the following trajectory:
          <trajectory>{outputs}</trajectory>
        `.trim(),
      });

      await expect(evaluator).toEvaluateAtLeast(
        {
          outputs: response.messages,
        },
        0.9,
      );
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
      const evaluator = createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: { [CREATE_TRANSACTION_TOOL_NAME]: ["amount"] },
      });

      await expect(evaluator).toEvaluateTrue({
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
    });

    it("corrects amount under voice input when history suggests smaller price", async () => {
      // Arrange
      const account = fakeAccount({ userId });
      await accountRepository.create(account);
      const food = Category.create(
        fakeCreateCategoryInput({
          userId,
          type: CategoryType.EXPENSE,
          name: "food",
        }),
      );
      await categoryRepository.create(food);
      // Create 3 prior "food" expenses around 5–15 EUR
      for (let i = 0; i < 3; i++) {
        await transactionRepository.create(
          fakeExpense({
            userId,
            account,
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
      const evaluator = createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: { [CREATE_TRANSACTION_TOOL_NAME]: ["amount"] },
      });

      await expect(evaluator).toEvaluateTrue({
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
    });

    it("does not correct amount under keyboard input when history suggests smaller price", async () => {
      // Arrange
      const account = fakeAccount({ userId });
      await accountRepository.create(account);
      const food = Category.create(
        fakeCreateCategoryInput({
          userId,
          type: CategoryType.EXPENSE,
          name: "food",
        }),
      );
      await categoryRepository.create(food);
      // Create 3 prior "food" expenses around 5–15 EUR
      for (let i = 0; i < 3; i++) {
        await transactionRepository.create(
          fakeExpense({
            userId,
            account,
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
      const evaluator = createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: { [CREATE_TRANSACTION_TOOL_NAME]: ["amount"] },
      });

      await expect(evaluator).toEvaluateTrue({
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
      const evaluator = createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: { [CREATE_TRANSACTION_TOOL_NAME]: ["amount"] },
      });

      await expect(evaluator).toEvaluateTrue({
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
      const evaluator = createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: { [CREATE_TRANSACTION_TOOL_NAME]: ["amount"] },
      });

      await expect(evaluator).toEvaluateTrue({
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
      const evaluator = createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: { [CREATE_TRANSACTION_TOOL_NAME]: ["amount"] },
      });

      await expect(evaluator).toEvaluateTrue({
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
      const evaluator = createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: { [CREATE_TRANSACTION_TOOL_NAME]: ["amount"] },
      });

      await expect(evaluator).toEvaluateTrue({
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
      const evaluator = createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: { [CREATE_TRANSACTION_TOOL_NAME]: ["amount"] },
      });

      await expect(evaluator).toEvaluateTrue({
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
      const evaluator = createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: { [CREATE_TRANSACTION_TOOL_NAME]: ["amount"] },
      });

      await expect(evaluator).toEvaluateTrue({
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

      const category = Category.create(
        fakeCreateCategoryInput({
          userId,
          type: CategoryType.EXPENSE,
        }),
      );
      await categoryRepository.create(category);

      // Seed recurring history — same description and amount, recorded monthly
      const todayPlainDate = Temporal.Now.plainDateISO();
      const recurringAmount = 50;
      const recurringDescription = "gym abo";
      for (const days of [10, 40, 70, 100]) {
        await transactionRepository.create(
          fakeExpense({
            userId,
            account,
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
      const evaluator = createTrajectoryMatchEvaluator({
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
      });

      await expect(evaluator).toEvaluateTrue({
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
    });

    it("does not create transaction from varying-amount recurring matches", async () => {
      // Arrange
      const account = fakeAccount({ userId, currency: "EUR" });
      await accountRepository.create(account);

      const category = Category.create(
        fakeCreateCategoryInput({
          userId,
          type: CategoryType.EXPENSE,
        }),
      );
      await categoryRepository.create(category);

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
            account,
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

      const category = Category.create(
        fakeCreateCategoryInput({
          userId,
          type: CategoryType.EXPENSE,
        }),
      );
      await categoryRepository.create(category);

      // Seed exactly one prior "gym abo" transaction — not a recurring pattern
      const todayPlainDate = Temporal.Now.plainDateISO();
      await transactionRepository.create(
        fakeExpense({
          userId,
          account,
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

      const category = fakeCategory({
        userId,
        type: CategoryType.EXPENSE,
      });
      await categoryRepository.create(category);

      // Seed unrelated history — no transaction described "gym"
      const todayPlainDate = Temporal.Now.plainDateISO();
      await transactionRepository.create(
        fakeExpense({
          userId,
          account,
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
