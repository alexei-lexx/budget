import { faker } from "@faker-js/faker";
import {
  createTrajectoryLLMAsJudge,
  createTrajectoryMatchEvaluator,
} from "agentevals";
import { AIMessage, HumanMessage } from "langchain";
import { Temporal } from "temporal-polyfill";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
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
import { toDateString } from "../../types/date-string";
import { createDynamoDBDocumentClient } from "../../utils/dynamo-client";
import { truncateAllTables } from "../../utils/test-utils/dynamodb-helpers";
import { fakeAccount } from "../../utils/test-utils/models/account-fakes";
import { fakeCategory } from "../../utils/test-utils/models/category-fakes";
import {
  fakeExpense,
  fakeTransaction,
} from "../../utils/test-utils/models/transaction-fakes";
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

// Every case here checks the agent's actual behavior against a prompt-driven
// rule (amount correction, HH:MM/pair parsing, recurring-amount detection,
// description quality, or a validation rule's positive/negative branch) —
// there is no deterministic code behind these rules, so only a real LLM call
// can verify them, including cases where the expected outcome is refusing to
// act. create-transaction-agent.int.test.ts keeps only the minimal wiring
// smoke test (3 happy paths, 1 negative case); everything else lives here and
// is expected to occasionally need re-running when a model or prompt change
// causes a genuine regression to investigate.

// Reference trajectories only need to contain the expected create_transaction
// tool call — createTrajectoryMatchEvaluator's "superset" mode only compares
// tool calls, not message order/content, so preliminary lookups the agent
// makes (get_accounts, get_transactions, etc.) don't need to be replicated.
function createTransactionReference(args: Record<string, unknown>) {
  return [
    new AIMessage({
      content: "",
      tool_calls: [
        {
          name: CREATE_TRANSACTION_TOOL_NAME,
          args,
          id: "reference-call",
          type: "tool_call",
        },
      ],
    }),
  ];
}

// `fields` lists which create_transaction argument keys must match exactly;
// every other key (e.g. accountId, categoryId when not under test) is
// ignored, matching what the equivalent hand-rolled assertions used to check.
function createTransactionTrajectoryMatch(fields: string[]) {
  return createTrajectoryMatchEvaluator({
    trajectoryMatchMode: "superset",
    toolArgsMatchOverrides: { [CREATE_TRANSACTION_TOOL_NAME]: fields },
  });
}

const DESCRIPTION_QUALITY_PROMPT = `
You are grading whether an AI agent's inferred transaction description follows these rules:

- MUST be grammatically correct, without typos
- MUST describe the item or service — not the reason or context for the purchase
- MUST NOT be built from the category name, its variations, or its translations
- MUST provide meaningful details that supplement the transaction
- MUST default to blank only when no meaningful description can be formed from the input

Look at the "description" argument of the create_transaction tool call in the
trajectory below, and at the original user message that started the trajectory.

<trajectory>
{outputs}
</trajectory>

Scoring:
- If the description is non-blank: score 1 only if it follows every rule above
  (grammatically correct, describes the item/service not the reason, is not
  just the category name, adds meaningful detail). Score 0 if it violates any
  rule.
- If the description is blank: score 1 only if the user's message contains no
  concrete, describable item, service, brand, or place beyond the category
  and amount. Score 0 if the user's message named something specific that the
  agent should have captured instead of leaving the description blank.
`.trim();

// Takes `model` as a parameter (rather than closing over it) because this
// function is defined at module scope, while `model` is only assigned
// inside the `describe` block's `beforeAll` — it's in scope at each call
// site (inside an `it(...)` in that same `describe`), not here.
function createDescriptionQualityJudge(
  model: Awaited<ReturnType<typeof createChatModel>>,
) {
  return createTrajectoryLLMAsJudge({
    prompt: DESCRIPTION_QUALITY_PROMPT,
    judge: model,
  });
}

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

  beforeEach(async () => {
    await truncateAllTables(createDynamoDBDocumentClient());

    const user = fakeUser();
    await userRepository.create(user);
    userId = user.id;

    today = Temporal.Now.plainDateISO().toString();
    context = { userId, today };
  });

  it("does not create transaction when no history exists", async () => {
    // Arrange
    await accountRepository.create(fakeAccount({ userId }));

    // Act
    const response = await agent.invoke(
      { messages: [new HumanMessage("bought apples")] },
      { context },
    );

    // Assert
    const toolNames = response.messages
      .filter(AIMessage.isInstance)
      .flatMap((message) => message.tool_calls ?? [])
      .map((toolCall) => toolCall.name);
    expect(toolNames).not.toContain(CREATE_TRANSACTION_TOOL_NAME);
  });

  describe("happy path", () => {
    it("extracts fields correctly when expense is given", async () => {
      // Arrange
      const account = fakeAccount({ userId, currency: "EUR" });
      await accountRepository.create(account);
      const category = await categoryRepository.create(
        fakeCategory({
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
      const result = await createTransactionTrajectoryMatch([
        "accountId",
        "amount",
        "categoryId",
        "date",
        "type",
      ])({
        outputs: response.messages,
        referenceOutputs: createTransactionReference({
          accountId: account.id,
          amount: 10,
          categoryId: category.id,
          date: today,
          type: TransactionType.EXPENSE,
        }),
      });
      expect(result.score).toBe(true);
    });

    it("extracts fields correctly when income is given", async () => {
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
      const result = await createTransactionTrajectoryMatch([
        "accountId",
        "amount",
        "categoryId",
        "date",
        "type",
      ])({
        outputs: response.messages,
        referenceOutputs: createTransactionReference({
          accountId: account.id,
          amount: 1000,
          categoryId: category.id,
          date: today,
          type: TransactionType.INCOME,
        }),
      });
      expect(result.score).toBe(true);
    });

    it("extracts fields correctly when refund is given", async () => {
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
      const result = await createTransactionTrajectoryMatch([
        "accountId",
        "amount",
        "categoryId",
        "date",
        "type",
      ])({
        outputs: response.messages,
        referenceOutputs: createTransactionReference({
          accountId: account.id,
          amount: 50,
          categoryId: category.id,
          date: today,
          type: TransactionType.REFUND,
        }),
      });
      expect(result.score).toBe(true);
    });
  });

  describe("category selection", () => {
    it("selects the category matching the item by signal, not name, among several candidates", async () => {
      // Arrange
      const account = fakeAccount({ userId, currency: "EUR" });
      await accountRepository.create(account);
      const groceries = await categoryRepository.create(
        fakeCategory({ userId, type: CategoryType.EXPENSE, name: "groceries" }),
      );
      await categoryRepository.create(
        fakeCategory({
          userId,
          type: CategoryType.EXPENSE,
          name: "electronics",
        }),
      );
      await categoryRepository.create(
        fakeCategory({
          userId,
          type: CategoryType.EXPENSE,
          name: "entertainment",
        }),
      );

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("bought apples for 10 euro")] },
        { context },
      );

      // Assert
      const result = await createTransactionTrajectoryMatch(["categoryId"])({
        outputs: response.messages,
        referenceOutputs: createTransactionReference({
          categoryId: groceries.id,
        }),
      });
      expect(result.score).toBe(true);
    });

    it("leaves category blank when no existing category matches", async () => {
      // Arrange
      const account = fakeAccount({ userId, currency: "EUR" });
      await accountRepository.create(account);
      await categoryRepository.create(
        fakeCategory({
          userId,
          type: CategoryType.EXPENSE,
          name: "electronics",
        }),
      );
      await categoryRepository.create(
        fakeCategory({
          userId,
          type: CategoryType.EXPENSE,
          name: "entertainment",
        }),
      );

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("bought apples for 10 euro")] },
        { context },
      );

      // Assert
      const result = await createTransactionTrajectoryMatch(["categoryId"])({
        outputs: response.messages,
        referenceOutputs: createTransactionReference({
          categoryId: undefined,
        }),
      });
      expect(result.score).toBe(true);
    });
  });

  describe("when amount is not given", () => {
    it("creates transaction from recurring matches that agree on amount", async () => {
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
      for (const days of [10, 25, 50, 80]) {
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
      const result = await createTransactionTrajectoryMatch([
        "accountId",
        "categoryId",
        "amount",
        "date",
        "type",
        "description",
      ])({
        outputs: response.messages,
        referenceOutputs: createTransactionReference({
          accountId: account.id,
          categoryId: category.id,
          amount: recurringAmount,
          date: today,
          type: TransactionType.EXPENSE,
          description: recurringDescription,
        }),
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
      // Seed "gym abo" history that disagrees on amount
      const todayPlainDate = Temporal.Now.plainDateISO();
      const recurringDescription = "gym abo";
      for (const [days, amount] of [
        [10, 20],
        [25, 35],
        [50, 47],
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
      const result = await createTransactionTrajectoryMatch(["amount"])({
        outputs: response.messages,
        referenceOutputs: createTransactionReference({ amount: 987 }),
      });
      expect(result.score).toBe(true);
    });

    it("corrects amount under voice input when history suggests smaller price", async () => {
      // Arrange
      const account = fakeAccount({ userId });
      await accountRepository.create(account);
      const category = await categoryRepository.create(
        fakeCategory({
          userId,
          type: CategoryType.EXPENSE,
          name: "food",
        }),
      );
      // Seed similar history — prior "food" expenses around 5–15 EUR
      const existingTransactionCount = 3;
      for (let i = 0; i < existingTransactionCount; i++) {
        await transactionRepository.create(
          fakeTransaction({
            userId,
            accountId: account.id,
            categoryId: category.id,
            amount: faker.number.int({ min: 5, max: 15 }),
            type: TransactionType.EXPENSE,
          }),
        );
      }

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("sandwich 987")] },
        { context: { ...context, isVoiceInput: true } },
      );

      // Assert
      const result = await createTransactionTrajectoryMatch(["amount"])({
        outputs: response.messages,
        referenceOutputs: createTransactionReference({ amount: 9.87 }),
      });
      expect(result.score).toBe(true);
    });

    it("does not correct amount under keyboard input when history suggests smaller price", async () => {
      // Arrange
      const account = fakeAccount({ userId });
      await accountRepository.create(account);
      const category = await categoryRepository.create(
        fakeCategory({
          userId,
          type: CategoryType.EXPENSE,
          name: "food",
        }),
      );
      // Seed similar history — prior "food" expenses around 5–15 EUR
      const existingTransactionCount = 3;
      for (let i = 0; i < existingTransactionCount; i++) {
        await transactionRepository.create(
          fakeTransaction({
            userId,
            accountId: account.id,
            categoryId: category.id,
            amount: faker.number.int({ min: 5, max: 15 }),
            type: TransactionType.EXPENSE,
          }),
        );
      }

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("sandwich 987")] },
        { context: { ...context, isVoiceInput: false } },
      );

      // Assert
      const result = await createTransactionTrajectoryMatch(["amount"])({
        outputs: response.messages,
        referenceOutputs: createTransactionReference({ amount: 987 }),
      });
      expect(result.score).toBe(true);
    });
  });

  describe("when message contains HH:MM-shaped string", () => {
    it("treats bare HH:MM string as price under voice input", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId }));

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("11:23")] },
        { context: { ...context, isVoiceInput: true } },
      );

      // Assert
      const result = await createTransactionTrajectoryMatch(["amount"])({
        outputs: response.messages,
        referenceOutputs: createTransactionReference({ amount: 11.23 }),
      });
      expect(result.score).toBe(true);
    });

    it("treats HH:MM string in mixed text as price under voice input", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId }));

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("groceries 7:50")] },
        { context: { ...context, isVoiceInput: true } },
      );

      // Assert
      const result = await createTransactionTrajectoryMatch(["amount"])({
        outputs: response.messages,
        referenceOutputs: createTransactionReference({ amount: 7.5 }),
      });
      expect(result.score).toBe(true);
    });

    it("treats HH:MM string as price when preposition refers to place", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId }));

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("lunch 11:23 at cafe")] },
        { context: { ...context, isVoiceInput: true } },
      );

      // Assert
      const result = await createTransactionTrajectoryMatch(["amount"])({
        outputs: response.messages,
        referenceOutputs: createTransactionReference({ amount: 11.23 }),
      });
      expect(result.score).toBe(true);
    });

    it("prefers explicit numeric amount over HH:MM string when both are given", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId }));

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("transferred 100 at 15:30")] },
        { context: { ...context, isVoiceInput: true } },
      );

      // Assert
      const result = await createTransactionTrajectoryMatch(["amount"])({
        outputs: response.messages,
        referenceOutputs: createTransactionReference({ amount: 100 }),
      });
      expect(result.score).toBe(true);
    });

    it("does not call create_transaction when HH:MM string is clock time", async () => {
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

    it("does not call create_transaction under keyboard input", async () => {
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

  describe("when message contains space-separated integer pair", () => {
    it("treats two-digit fractional part as decimal amount under voice input", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId }));

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("apples, bananas 12 54")] },
        { context: { ...context, isVoiceInput: true } },
      );

      // Assert
      const result = await createTransactionTrajectoryMatch(["amount"])({
        outputs: response.messages,
        referenceOutputs: createTransactionReference({ amount: 12.54 }),
      });
      expect(result.score).toBe(true);
    });

    it("treats single-digit fractional part as decimal amount with leading zero under voice input", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId }));

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("coffee 12 5")] },
        { context: { ...context, isVoiceInput: true } },
      );

      // Assert
      const result = await createTransactionTrajectoryMatch(["amount"])({
        outputs: response.messages,
        referenceOutputs: createTransactionReference({ amount: 12.05 }),
      });
      expect(result.score).toBe(true);
    });

    it("does not call create_transaction under keyboard input", async () => {
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

  describe("description inference", () => {
    it("produces a description that follows the description-inference rules", async () => {
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
            new HumanMessage("bought a used mountain bike for 200 euro"),
          ],
        },
        { context },
      );

      // Assert
      const result = await createDescriptionQualityJudge(model)({
        outputs: response.messages,
      });
      expect(result.score).toBe(true);
    });
  });
});
