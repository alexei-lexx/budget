import { randomUUID } from "crypto";
import { LangChainInstrumentation } from "@arizeai/openinference-instrumentation-langchain";
import * as px from "@arizeai/phoenix-client/vitest";
import { createEvaluator } from "@arizeai/phoenix-evals";
import { faker } from "@faker-js/faker";
import * as CallbackManagerModule from "@langchain/core/callbacks/manager";
import { awaitAllCallbacks } from "@langchain/core/callbacks/promises";
import { createTrajectoryMatchEvaluator } from "agentevals";
import { AIMessage, BaseMessage, HumanMessage } from "langchain";
import { v5 as uuidv5 } from "uuid";
import { afterEach, beforeAll, beforeEach, expect } from "vitest";
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
import { toDateString } from "../../types/date-string";
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

// Type aliases, not interfaces: Phoenix types need index signature (KVMap).
// Only type aliases get it implicitly.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type TestInputs = {
  message: string;
  accounts: Partial<AccountData>[];
  categories?: Partial<CategoryData>[];
  transactions?: Partial<TransactionData>[];
  isVoiceInput?: boolean;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type TestReferenceToolCalls = {
  toolCalls: {
    name: string;
    args: Record<string, unknown>;
  }[];
};

const agentModelId = requireEnv(
  "LANGCHAIN_MODEL_ID",
  DEFAULT_LANGCHAIN_MODEL_ID,
);

// Separate judge keeps scores comparable when LANGCHAIN_MODEL_ID changes
const judgeModelId = requireEnv(
  "JUDGE_LANGCHAIN_MODEL_ID",
  DEFAULT_LANGCHAIN_MODEL_ID,
);

// Optional, random name when not set, e.g. "dolores-illo-est".
// The name must be unique for each run.
// experimentName comes from patches/@arizeai+phoenix-client+7.18.2.patch.
const experimentName =
  process.env["EVAL_EXPERIMENT_NAME"] ?? faker.lorem.slug();

// Records trajectory match as named Phoenix score with evaluator trace.
// Phoenix score is number, so boolean match becomes 1 or 0.
const trajectorySupersetMatch = createEvaluator<{
  output: BaseMessage[];
  expected: TestReferenceToolCalls;
}>(
  async ({
    output,
    expected,
  }: {
    output: BaseMessage[];
    expected: TestReferenceToolCalls;
  }) => {
    // Agent may call tools with more args than reference lists.
    // Compares only args listed in reference tool calls.
    const toolArgsToCompare: Record<string, string[]> = {};
    for (const toolCall of expected.toolCalls) {
      toolArgsToCompare[toolCall.name] = Object.keys(toolCall.args);
    }

    const evaluator = createTrajectoryMatchEvaluator({
      trajectoryMatchMode: "superset",
      toolArgsMatchOverrides: toolArgsToCompare,
    });

    const result = await evaluator({
      outputs: output,
      referenceOutputs: [
        new AIMessage({
          tool_calls: expected.toolCalls.map((toolCall) => ({
            ...toolCall,
            id: "required-dummy-id",
          })),
        }),
      ],
    });

    return result.score === true ? 1 : 0;
  },
  { name: "trajectory_superset_match", kind: "CODE" },
);

px.describe(
  "CreateTransactionAgent",
  () => {
    const today = toDateString("2000-01-02");
    const userId = testId("current-user");

    let model: Awaited<ReturnType<typeof createChatModel>>;
    let agent: ReturnType<typeof createCreateTransactionAgent>;
    let context: { userId: string; today: string; isVoiceInput?: boolean };

    beforeAll(async () => {
      model = await createChatModel(agentModelId);

      agent = createCreateTransactionAgent({
        model,
        transactionRepository: resolveTransactionRepository(),
        accountService: resolveAccountService(),
        aggregateTransactionsService: resolveAggregateTransactionsService(),
        categoryService: resolveCategoryService(),
        transactionService: resolveTransactionService(),
        logger: createMockLogger(),
        // Keep this run out of prompt cache of other runs
        testOnlyPromptCacheIsolationPrefix: `Request ID: ${randomUUID()}`,
      });
    });

    beforeEach(async () => {
      // Sends LangChain spans to tracer provider of Phoenix suite.
      // Spans become child spans of each test run.
      // Suite registers provider in its own beforeAll,
      // which runs after beforeAll hooks of this file and replaces global proxy.
      // So instrumentation created earlier keeps no-op tracer.
      // Each new instrumentation replaces patch of previous one.
      new LangChainInstrumentation().manuallyInstrument(CallbackManagerModule);

      await truncateAllTables(createDynamoDBDocumentClient());

      const user = fakeUser({ id: userId });
      const userRepository = resolveUserRepository();
      await userRepository.create(user);

      context = { userId, today };
    });

    // LangChain runs callbacks in background.
    // Waits for them, so last spans end before suite flushes tracer provider.
    afterEach(async () => {
      await awaitAllCallbacks();
    });

    async function testToolCalls({
      input,
      expected,
    }: {
      input: TestInputs;
      expected?: TestReferenceToolCalls;
    }) {
      // Arrange
      await seedDatabase(input, userId);

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage(input.message)] },
        { context: { ...context, isVoiceInput: input.isVoiceInput } },
      );
      px.logOutput({ answer: response.messages.at(-1)?.text });

      // Assert
      const { score } = await px.evaluate(trajectorySupersetMatch, {
        output: response.messages,
        expected: expected ?? { toolCalls: [] },
      });

      expect(score).toBe(1);
    }

    px.test<TestInputs, TestReferenceToolCalls>(
      "creates expense transaction",
      {
        id: testId("creates expense transaction"),
        input: {
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
        expected: {
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

    px.test<TestInputs, TestReferenceToolCalls>(
      "creates income transaction",
      {
        id: testId("creates income transaction"),
        input: {
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
        expected: {
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
  },
  {
    experimentName,
    metadata: { agentModelId, judgeModelId },
  },
);

// Generates stable UUID from readable name, e.g. testId("groceries").
// Schemas require UUID, and stable IDs keep Phoenix example IDs stable.
// UUID v5 hashes name + fixed UUID below, so same name always gives same UUID.
// Do not change fixed UUID: all IDs and dataset examples will change.
function testId(name: string) {
  return uuidv5(name, "fc0c6d23-9478-4607-a85c-2b32b5b6d8c8");
}

// Creates accounts, categories and transactions for given user.
async function seedDatabase(
  { accounts, categories = [], transactions = [] }: TestInputs,
  userId: string,
) {
  const accountRepository = resolveAccountRepository();
  const categoryRepository = resolveCategoryRepository();
  const transactionRepository = resolveTransactionRepository();

  for (const accountData of accounts) {
    await accountRepository.create(fakeAccount({ ...accountData, userId }));
  }

  for (const categoryData of categories) {
    await categoryRepository.create(fakeCategory({ ...categoryData, userId }));
  }

  for (const transactionData of transactions) {
    await transactionRepository.create(
      fakeTransaction({ ...transactionData, userId }),
    );
  }
}
