import { randomUUID } from "crypto";
import {
  createTrajectoryLLMAsJudge,
  createTrajectoryMatchEvaluator,
} from "agentevals";
import { AIMessage, HumanMessage } from "langchain";
import * as ls from "langsmith/vitest";
import { Temporal } from "temporal-polyfill";
import { v5 as uuidv5 } from "uuid";
import { beforeAll, beforeEach, expect } from "vitest";
import {
  createChatModel,
  resolveAccountRepository,
  resolveAccountService,
  resolveAggregateTransactionsService,
  resolveCategoryRepository,
  resolveCategoryService,
  resolveTransactionRepository,
  resolveTransactionService,
  resolveUserRepository,
} from "../../dependencies";
import { AccountData } from "../../models/account";
import { CategoryData } from "../../models/category";
import { TransactionData, TransactionType } from "../../models/transaction";
import { DateString, toDateString } from "../../types/date-string";
import { createDynamoDBDocumentClient } from "../../utils/dynamo-client";
import { requireEnv } from "../../utils/require-env";
import { truncateAllTables } from "../../utils/test-utils/dynamodb-helpers";
import { fakeAccount } from "../../utils/test-utils/models/account-fakes";
import { fakeCategory } from "../../utils/test-utils/models/category-fakes";
import { fakeTransaction } from "../../utils/test-utils/models/transaction-fakes";
import { fakeUser } from "../../utils/test-utils/models/user-fakes";
import { createMockLogger } from "../../utils/test-utils/providers/logger-mocks";
import { DEFAULT_LANGCHAIN_MODEL_ID } from "../settings";
import { CREATE_TRANSACTION_TOOL_NAME } from "../tools/create-transaction";
import { createCreateTransactionAgent } from "./create-transaction-agent";

interface TestInputs {
  message: string;
  accounts: Partial<AccountData>[];
  categories?: Partial<CategoryData>[];
  transactions?: Partial<TransactionData>[];
  isVoiceInput?: boolean;
}

interface TestReferenceToolCalls {
  toolCalls: {
    name: string;
    args: Record<string, unknown>;
  }[];
}

interface TestReferenceCriteria {
  criteria: string;
}

const agentModelId = requireEnv(
  "LANGCHAIN_MODEL_ID",
  DEFAULT_LANGCHAIN_MODEL_ID,
);

// Separate judge keeps scores comparable when LANGCHAIN_MODEL_ID changes
const judgeModelId = requireEnv(
  "JUDGE_LANGCHAIN_MODEL_ID",
  DEFAULT_LANGCHAIN_MODEL_ID,
);

// Optional, LangSmith gives a random name when not set.
// The name must be unique for each run.
const experimentName = process.env["EVAL_EXPERIMENT_NAME"];

ls.describe(
  "CreateTransactionAgent",
  () => {
    const accountService = resolveAccountService();
    const aggregateTransactionsService = resolveAggregateTransactionsService();
    const categoryService = resolveCategoryService();
    const transactionRepository = resolveTransactionRepository();
    const transactionService = resolveTransactionService();
    const userRepository = resolveUserRepository();

    const today = toDateString("2000-01-02");
    const userId = testId("current-user");

    let model: Awaited<ReturnType<typeof createChatModel>>;
    let judgeModel: Awaited<ReturnType<typeof createChatModel>>;
    let agent: ReturnType<typeof createCreateTransactionAgent>;
    let context: { userId: string; today: string; isVoiceInput?: boolean };

    beforeAll(async () => {
      model = await createChatModel(agentModelId);
      judgeModel = await createChatModel(judgeModelId);
      const logger = createMockLogger();

      agent = createCreateTransactionAgent({
        model,
        transactionRepository,
        accountService,
        aggregateTransactionsService,
        categoryService,
        transactionService,
        logger,
        // Keep this run out of prompt cache of other runs
        testOnlyPromptCacheIsolationPrefix: `Request ID: ${randomUUID()}`,
      });
    });

    beforeEach(async () => {
      await truncateAllTables(createDynamoDBDocumentClient());

      const user = fakeUser({ id: userId });
      await userRepository.create(user);

      context = { userId, today };
    });

    async function testToolCalls({
      inputs,
      referenceOutputs,
    }: {
      inputs: TestInputs;
      referenceOutputs?: TestReferenceToolCalls;
    }) {
      // Arrange
      await seedDatabase(inputs, userId);

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage(inputs.message)] },
        { context: { ...context, isVoiceInput: inputs.isVoiceInput } },
      );
      ls.logOutputs({ answer: response.messages.at(-1)?.text });

      // Assert

      // Agent may call tools with more args than reference lists.
      // Compares only args listed in reference tool calls.
      const toolArgsToCompare: Record<string, string[]> = {};
      for (const toolCall of referenceOutputs?.toolCalls || []) {
        toolArgsToCompare[toolCall.name] = Object.keys(toolCall.args);
      }

      const evaluator = createTrajectoryMatchEvaluator({
        trajectoryMatchMode: "superset",
        toolArgsMatchOverrides: toolArgsToCompare,
      });

      const result = await evaluator({
        outputs: response.messages,
        referenceOutputs: [
          new AIMessage({
            tool_calls: referenceOutputs?.toolCalls.map((toolCall) => ({
              ...toolCall,
              id: "required-dummy-id",
            })),
          }),
        ],
      });

      expect(result.score).toBe(true);
    }

    async function testWithJudge({
      inputs,
      referenceOutputs,
    }: {
      inputs: TestInputs;
      referenceOutputs?: TestReferenceCriteria;
    }) {
      // Arrange
      await seedDatabase(inputs, userId);

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage(inputs.message)] },
        { context },
      );
      ls.logOutputs({ answer: response.messages.at(-1)?.text });

      // Assert
      const evaluator = createTrajectoryLLMAsJudge({
        continuous: true,
        judge: judgeModel,
        prompt: `{criteria}

        Grade the following trajectory:
        <trajectory>{outputs}</trajectory>
      `.trim(),
      });

      // Judge prompt gets criteria through extra param
      const result = await evaluator({
        outputs: response.messages,
        criteria: referenceOutputs?.criteria,
      });

      expect(result.score).toBeGreaterThanOrEqual(0.9);
    }

    async function testNoTransactionCreated({
      inputs,
    }: {
      inputs: TestInputs;
    }) {
      // Arrange
      await seedDatabase(inputs, userId);

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage(inputs.message)] },
        { context: { ...context, isVoiceInput: inputs.isVoiceInput } },
      );
      ls.logOutputs({ answer: response.messages.at(-1)?.text });

      // Assert
      const toolNames = response.messages
        .filter(AIMessage.isInstance)
        .flatMap((message) => message.tool_calls ?? [])
        .map((toolCall) => toolCall.name);
      expect(toolNames).not.toContain(CREATE_TRANSACTION_TOOL_NAME);
    }

    ls.test<TestInputs, TestReferenceToolCalls>(
      "creates expense transaction",
      {
        inputs: {
          message: "bought apples for 10 euro",
          accounts: [{ id: testId("default"), currency: "EUR" }],
          categories: [
            {
              id: testId("groceries"),
              type: "EXPENSE",
              name: "groceries",
            },
          ],
        },
        referenceOutputs: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: {
                accountId: testId("default"),
                amount: 10,
                categoryId: testId("groceries"),
                date: today,
                type: TransactionType.EXPENSE,
              },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "creates expense transaction from amount breakdown",
      {
        inputs: {
          message: "bought apples for 10 and pears for 5 euro",
          accounts: [{ id: testId("default"), currency: "EUR" }],
          categories: [
            {
              id: testId("groceries"),
              type: "EXPENSE",
              name: "groceries",
            },
          ],
        },
        referenceOutputs: {
          toolCalls: [
            { name: "sum", args: {} },
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: {
                accountId: testId("default"),
                amount: 15,
                categoryId: testId("groceries"),
                date: today,
                type: TransactionType.EXPENSE,
              },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "creates expense transaction by default",
      {
        inputs: {
          // No explicit "bought" or "spent" verb
          message: "apples 10 euro",
          accounts: [{ currency: "EUR" }],
        },
        referenceOutputs: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { type: TransactionType.EXPENSE },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "creates income transaction",
      {
        inputs: {
          message: "received salary of 1000 euro",
          accounts: [{ id: testId("default"), currency: "EUR" }],
          categories: [
            {
              id: testId("salary"),
              type: "INCOME",
              name: "salary",
            },
          ],
        },
        referenceOutputs: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: {
                accountId: testId("default"),
                amount: 1000,
                categoryId: testId("salary"),
                date: today,
                type: TransactionType.INCOME,
              },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "creates income transaction from amount breakdown",
      {
        inputs: {
          message: "received salary 1000 with bonus 200 euro on top",
          accounts: [{ id: testId("default"), currency: "EUR" }],
          categories: [
            {
              id: testId("salary"),
              type: "INCOME",
              name: "salary",
            },
          ],
        },
        referenceOutputs: {
          toolCalls: [
            { name: "sum", args: {} },
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: {
                accountId: testId("default"),
                amount: 1200,
                categoryId: testId("salary"),
                date: today,
                type: TransactionType.INCOME,
              },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "creates refund transaction",
      {
        inputs: {
          message: "got a refund of 50 euro for shoes",
          accounts: [{ id: testId("default"), currency: "EUR" }],
          categories: [
            {
              id: testId("shoes"),
              type: "EXPENSE",
              name: "shoes",
            },
          ],
        },
        referenceOutputs: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: {
                accountId: testId("default"),
                amount: 50,
                categoryId: testId("shoes"),
                date: today,
                type: TransactionType.REFUND,
              },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "creates refund transaction from amount breakdown",
      {
        inputs: {
          message: "got a refund for boots 50 and sneakers 30 euro",
          accounts: [{ id: testId("default"), currency: "EUR" }],
          categories: [
            {
              id: testId("shoes"),
              type: "EXPENSE",
              name: "shoes",
            },
          ],
        },
        referenceOutputs: {
          toolCalls: [
            { name: "sum", args: {} },
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: {
                accountId: testId("default"),
                amount: 80,
                categoryId: testId("shoes"),
                date: today,
                type: TransactionType.REFUND,
              },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "fetches active accounts and active categories to create transaction",
      {
        inputs: {
          message: "bought apples for 10 euro",
          accounts: [{ currency: "EUR" }],
        },
        referenceOutputs: {
          toolCalls: [
            { name: "get_accounts", args: { scope: "ACTIVE" } },
            { name: "get_categories", args: { scope: "ACTIVE" } },
            { name: CREATE_TRANSACTION_TOOL_NAME, args: {} },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "infers account by currency",
      {
        inputs: {
          message: "bought apples for 50 pounds",
          accounts: [
            { currency: "EUR" },
            { id: testId("gbp"), currency: "GBP" },
            { currency: "USD" },
          ],
        },
        referenceOutputs: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { accountId: testId("gbp") },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "selects account by name",
      {
        inputs: {
          message: "bought apples for 50 in cash",
          accounts: [
            { name: "My Visa", currency: "EUR" },
            { id: testId("cash"), name: "My Cash", currency: "EUR" },
          ],
        },
        referenceOutputs: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { accountId: testId("cash") },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "selects most used account for category",
      {
        inputs: {
          message: "bought apples for 50 euro",
          accounts: [
            { id: testId("cash"), name: "cash", currency: "EUR" },
            { id: testId("card"), name: "card", currency: "EUR" },
          ],
          categories: [
            { id: testId("groceries"), type: "EXPENSE", name: "groceries" },
            { id: testId("transport"), type: "EXPENSE", name: "transport" },
          ],
          transactions: [
            // 3 groceries purchases using cash - weaker signal for groceries
            ...Array.from({ length: 3 }, (_, i) => ({
              accountId: testId("cash"),
              categoryId: testId("groceries"),
              currency: "EUR",
              date: daysAgo(i + 1, today),
              description: undefined, // No description: random one can mislead agent
            })),
            // 5 transport purchases using cash - noise, unrelated category
            ...Array.from({ length: 5 }, (_, i) => ({
              accountId: testId("cash"),
              categoryId: testId("transport"),
              currency: "EUR",
              date: daysAgo(i + 1, today),
              description: undefined, // No description: random one can mislead agent
            })),
            // 5 groceries purchases using card - stronger signal, expected account
            ...Array.from({ length: 5 }, (_, i) => ({
              accountId: testId("card"),
              categoryId: testId("groceries"),
              currency: "EUR",
              date: daysAgo(i + 1, today),
              description: undefined, // No description: random one can mislead agent
            })),
          ],
        },
        referenceOutputs: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { accountId: testId("card") },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "selects most used account overall",
      {
        inputs: {
          message: "bought apples for 50 euro",
          accounts: [
            { id: testId("account-a"), name: "account A", currency: "EUR" },
            { id: testId("account-b"), name: "account B", currency: "EUR" },
          ],
          // Dates alternate between the accounts.
          // Account A has the most recent transaction.
          // The agent must count transactions per account.
          // The agent must not use the latest transaction.
          transactions: [
            // 3 purchases using account A - weaker signal.
            // Dates: 1, 3, 5 days ago.
            ...Array.from({ length: 3 }, (_, i) => ({
              accountId: testId("account-a"),
              currency: "EUR",
              date: daysAgo(2 * i + 1, today),
              description: undefined, // No description: random one can mislead agent
            })),
            // 5 purchases using account B - stronger signal, expected account.
            // Dates: 2, 4, 6, 8, 10 days ago.
            ...Array.from({ length: 5 }, (_, i) => ({
              accountId: testId("account-b"),
              currency: "EUR",
              date: daysAgo(2 * i + 2, today),
              description: undefined, // No description: random one can mislead agent
            })),
          ],
        },
        referenceOutputs: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { accountId: testId("account-b") },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "selects category by name",
      {
        inputs: {
          message: "bought groceries for 10 euros",
          accounts: [{ currency: "EUR" }],
          categories: [
            { id: testId("groceries"), type: "EXPENSE", name: "groceries" },
            { type: "EXPENSE", name: "household" },
          ],
        },
        referenceOutputs: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { categoryId: testId("groceries") },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "selects category by signal",
      {
        inputs: {
          message: "bought detergents for 10 euro",
          accounts: [{ currency: "EUR" }],
          categories: [
            { type: "EXPENSE", name: "groceries" },
            { id: testId("household"), type: "EXPENSE", name: "household" },
          ],
        },
        referenceOutputs: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { categoryId: testId("household") },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "leaves category blank when no match",
      {
        inputs: {
          message: "bought apples for 10 euro",
          accounts: [{ currency: "EUR" }],
          categories: [
            { type: "EXPENSE", name: "electronics" },
            { type: "EXPENSE", name: "household" },
          ],
        },
        referenceOutputs: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { categoryId: undefined },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs, TestReferenceCriteria>(
      "produces description that only lists purchased items",
      {
        inputs: {
          message:
            "bought a used mountain bike and waterproof bike bags for 200 euro",
          accounts: [{ currency: "EUR" }],
        },
        referenceOutputs: {
          criteria: `Description must list only the purchased items
          (a used mountain bike, waterproof bike bags),
          may contain conjunctions, and nothing else.`,
        },
      },
      testWithJudge,
    );

    ls.test<TestInputs, TestReferenceCriteria>(
      "skips description that equals category name",
      {
        inputs: {
          message: "purchased groceries for 50 euro",
          accounts: [{ currency: "EUR" }],
          categories: [{ type: "EXPENSE", name: "groceries" }],
        },
        referenceOutputs: {
          criteria: `Description must be empty
          because the purchased item "groceries"
          equals the category name.

          "Description: N/A" in the agent's response means an empty description.`,
        },
      },
      testWithJudge,
    );

    ls.test<TestInputs, TestReferenceCriteria>(
      "skips description that equals translated category name",
      {
        inputs: {
          message: "Lebensmittel für 50 Euro gekauft",
          accounts: [{ currency: "EUR" }],
          categories: [{ type: "EXPENSE", name: "groceries" }],
        },
        referenceOutputs: {
          criteria: `Description must be empty
          because the purchased item "Lebensmittel"
          is the German translation of the category name "groceries".

          "Description: N/A" in the agent's response means an empty description.`,
        },
      },
      testWithJudge,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "creates one transaction from amount breakdown across categories",
      {
        inputs: {
          message: "meat 5 and shampoo 3 euro",
          accounts: [{ currency: "EUR" }],
          categories: [
            { type: "EXPENSE", name: "groceries" },
            { type: "EXPENSE", name: "household" },
          ],
        },
        referenceOutputs: {
          toolCalls: [
            { name: "sum", args: {} },
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { amount: 8 },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "creates transaction from decimal amount breakdown",
      {
        inputs: {
          message: "bread 1.29, cheese 3.45, butter 2.19 euro",
          accounts: [{ currency: "EUR" }],
        },
        referenceOutputs: {
          toolCalls: [
            { name: "sum", args: {} },
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { amount: 6.93 },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "creates transaction from written amount breakdown",
      {
        inputs: {
          message: "coffee two euros and croissant three fifty",
          accounts: [{ currency: "EUR" }],
        },
        referenceOutputs: {
          toolCalls: [
            { name: "sum", args: {} },
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { amount: 5.5 },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "does not treat quantity as amount breakdown",
      {
        inputs: {
          message: "2 kg of apples for 5 euro",
          accounts: [{ currency: "EUR" }],
        },
        referenceOutputs: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { amount: 5 },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs>(
      "does not create transaction for alternative amounts",
      {
        inputs: {
          message: "paid 10 or 20 euros",
          accounts: [{ currency: "EUR" }],
        },
      },
      testNoTransactionCreated,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "keeps suspiciously high amount from voice input without price history",
      {
        inputs: {
          message: "sandwich 987",
          accounts: [{ currency: "EUR" }],
          isVoiceInput: true,
        },
        referenceOutputs: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { amount: 987 },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "corrects suspiciously high amount from voice input using price history",
      {
        inputs: {
          message: "sandwich 987",
          accounts: [{ id: testId("default"), currency: "EUR" }],
          categories: [{ id: testId("food"), type: "EXPENSE", name: "food" }],
          // Create 3 prior "food" expenses around 5–15 EUR
          transactions: [
            {
              accountId: testId("default"),
              categoryId: testId("food"),
              amount: 10,
              currency: "EUR",
              date: daysAgo(3, today),
              description: "bread",
            },
            {
              accountId: testId("default"),
              categoryId: testId("food"),
              amount: 7,
              currency: "EUR",
              date: daysAgo(2, today),
              description: "milk",
            },
            {
              accountId: testId("default"),
              categoryId: testId("food"),
              amount: 10,
              currency: "EUR",
              date: daysAgo(1, today),
              description: "meat",
            },
          ],
          isVoiceInput: true,
        },
        referenceOutputs: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { amount: 9.87 },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "keeps suspiciously high amount from keyboard input despite price history",
      {
        inputs: {
          message: "sandwich 987",
          accounts: [{ id: testId("default"), currency: "EUR" }],
          categories: [{ id: testId("food"), type: "EXPENSE", name: "food" }],
          // Create 3 prior "food" expenses around 5–15 EUR
          transactions: [
            {
              accountId: testId("default"),
              categoryId: testId("food"),
              amount: 10,
              currency: "EUR",
              date: daysAgo(3, today),
              description: "bread",
            },
            {
              accountId: testId("default"),
              categoryId: testId("food"),
              amount: 7,
              currency: "EUR",
              date: daysAgo(2, today),
              description: "milk",
            },
            {
              accountId: testId("default"),
              categoryId: testId("food"),
              amount: 10,
              currency: "EUR",
              date: daysAgo(1, today),
              description: "meat",
            },
          ],
          isVoiceInput: false,
        },
        referenceOutputs: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { amount: 987 },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "parses bare HH:MM as amount under voice input",
      {
        inputs: {
          message: "11:23",
          accounts: [{ currency: "EUR" }],
          isVoiceInput: true,
        },
        referenceOutputs: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { amount: 11.23 },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "parses HH:MM in mixed text as amount under voice input",
      {
        inputs: {
          message: "groceries 7:50",
          accounts: [{ currency: "EUR" }],
          isVoiceInput: true,
        },
        referenceOutputs: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { amount: 7.5 },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "parses HH:MM as amount when preposition refers to place under voice input",
      {
        inputs: {
          message: "lunch 11:23 at cafe",
          accounts: [{ currency: "EUR" }],
          isVoiceInput: true,
        },
        referenceOutputs: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { amount: 11.23 },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "prefers explicit amount over HH:MM under voice input",
      {
        inputs: {
          message: "paid 100 at 15:30",
          accounts: [{ currency: "EUR" }],
          isVoiceInput: true,
        },
        referenceOutputs: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { amount: 100 },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs>(
      "does not create transaction when HH:MM is clock time under voice input",
      {
        inputs: {
          message: "I bought coffee at 12:34",
          accounts: [{ currency: "EUR" }],
          isVoiceInput: true,
        },
      },
      testNoTransactionCreated,
    );

    ls.test<TestInputs>(
      "does not create transaction for bare HH:MM under keyboard input",
      {
        inputs: {
          message: "11:23",
          accounts: [{ currency: "EUR" }],
          isVoiceInput: false,
        },
      },
      testNoTransactionCreated,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "parses NN NN as amount under voice input",
      {
        inputs: {
          message: "apples, bananas 12 54",
          accounts: [{ currency: "EUR" }],
          isVoiceInput: true,
        },
        referenceOutputs: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { amount: 12.54 },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "parses NN N as amount with leading zero under voice input",
      {
        inputs: {
          message: "coffee 12 5",
          accounts: [{ currency: "EUR" }],
          isVoiceInput: true,
        },
        referenceOutputs: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { amount: 12.05 },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs>(
      "does not create transaction for NN NN under keyboard input",
      {
        inputs: {
          message: "apples, bananas 12 54",
          accounts: [{ currency: "EUR" }],
          isVoiceInput: false,
        },
      },
      testNoTransactionCreated,
    );

    ls.test<TestInputs, TestReferenceToolCalls>(
      "creates transaction from same-amount recurring matches",
      {
        inputs: {
          message: "gym",
          accounts: [{ id: testId("default"), currency: "EUR" }],
          categories: [{ id: testId("sport"), type: "EXPENSE" }],
          // Same description and amount, recorded monthly
          transactions: [10, 40, 70, 100].map((days) => ({
            accountId: testId("default"),
            categoryId: testId("sport"),
            amount: 50,
            currency: "EUR",
            date: daysAgo(days, today),
            description: "gym abo",
          })),
        },
        referenceOutputs: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: {
                accountId: testId("default"),
                categoryId: testId("sport"),
                amount: 50,
                date: today,
                type: TransactionType.EXPENSE,
                description: "gym abo",
              },
            },
          ],
        },
      },
      testToolCalls,
    );

    ls.test<TestInputs>(
      "does not create transaction from varying-amount recurring matches",
      {
        inputs: {
          message: "gym",
          accounts: [{ id: testId("default"), currency: "EUR" }],
          categories: [{ id: testId("sport"), type: "EXPENSE" }],
          // Same description, different amounts
          transactions: [
            {
              accountId: testId("default"),
              categoryId: testId("sport"),
              amount: 20,
              currency: "EUR",
              date: daysAgo(10, today),
              description: "gym abo",
            },
            {
              accountId: testId("default"),
              categoryId: testId("sport"),
              amount: 35,
              currency: "EUR",
              date: daysAgo(40, today),
              description: "gym abo",
            },
            {
              accountId: testId("default"),
              categoryId: testId("sport"),
              amount: 47,
              currency: "EUR",
              date: daysAgo(70, today),
              description: "gym abo",
            },
          ],
        },
      },
      testNoTransactionCreated,
    );

    ls.test<TestInputs>(
      "does not create transaction from single prior match",
      {
        inputs: {
          message: "gym",
          accounts: [{ id: testId("default"), currency: "EUR" }],
          categories: [{ id: testId("sport"), type: "EXPENSE" }],
          // One prior match is not recurring pattern
          transactions: [
            {
              accountId: testId("default"),
              categoryId: testId("sport"),
              amount: 50,
              currency: "EUR",
              date: daysAgo(15, today),
              description: "gym abo",
            },
          ],
        },
      },
      testNoTransactionCreated,
    );

    ls.test<TestInputs>(
      "does not create transaction without prior matches",
      {
        inputs: {
          message: "gym",
          accounts: [{ id: testId("default"), currency: "EUR" }],
          categories: [{ id: testId("food"), type: "EXPENSE", name: "food" }],
          // Unrelated history, no "gym" description
          transactions: [
            {
              accountId: testId("default"),
              categoryId: testId("food"),
              amount: 50,
              currency: "EUR",
              date: daysAgo(20, today),
              description: "bread",
            },
          ],
        },
      },
      testNoTransactionCreated,
    );
  },
  {
    ...(experimentName && { projectName: experimentName }),
    metadata: { agentModelId, judgeModelId },
  },
);

// Generates stable UUID from readable name, e.g. testId("groceries").
// Schemas require UUID, and stable IDs keep LangSmith example IDs stable.
// UUID v5 hashes name + fixed UUID below, so same name always gives same UUID.
// Do not change fixed UUID: all IDs and dataset examples will change.
function testId(name: string) {
  return uuidv5(name, "fc0c6d23-9478-4607-a85c-2b32b5b6d8c8");
}

// Returns date that is given number of days before today
function daysAgo(days: number, today: DateString) {
  return toDateString(
    Temporal.PlainDate.from(today).subtract({ days }).toString(),
  );
}

// Creates accounts, categories and transactions for given user.
async function seedDatabase(
  { accounts, categories = [], transactions = [] }: TestInputs,
  userId: string,
) {
  for (const accountData of accounts) {
    await resolveAccountRepository().create(
      fakeAccount({ ...accountData, userId }),
    );
  }

  for (const categoryData of categories) {
    await resolveCategoryRepository().create(
      fakeCategory({ ...categoryData, userId }),
    );
  }

  for (const transactionData of transactions) {
    await resolveTransactionRepository().create(
      fakeTransaction({ ...transactionData, userId }),
    );
  }
}
