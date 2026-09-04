import { faker } from "@faker-js/faker";
import { AIMessage, HumanMessage } from "langchain";
import { createTrajectoryLLMAsJudge, createTrajectoryMatchEvaluator } from "agentevals";
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

// Every case here checks whether the agent followed a nuanced, purely
// prompt-driven inference rule (amount correction, HH:MM/pair parsing,
// recurring-amount detection, description quality) correctly — there is no
// deterministic code behind these rules, so only a real LLM call can verify
// them. Unlike create-transaction-agent.int.test.ts (routing/structural,
// low ambiguity), these are expected to occasionally need re-running when a
// model or prompt change causes a genuine regression to investigate.

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

describe("CreateTransactionAgent (evals)", () => {
  let context: { userId: string; today: string; isVoiceInput?: boolean };
  let today: string;
  let userId: string;
  let agent: ReturnType<typeof createCreateTransactionAgent>;

  beforeAll(async () => {
    const model = await createChatModel();
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
  });
});
