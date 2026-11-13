import { LangChainInstrumentation } from "@arizeai/openinference-instrumentation-langchain";
import * as px from "@arizeai/phoenix-client/vitest";
import * as CallbackManagerModule from "@langchain/core/callbacks/manager";
import { awaitAllCallbacks } from "@langchain/core/callbacks/promises";
import { afterEach, beforeAll, beforeEach } from "vitest";
import {
  createChatModel,
  resolveAccountService,
  resolveAggregateTransactionsService,
  resolveCategoryService,
  resolveTransactionRepository,
  resolveTransactionService,
  resolveUserRepository,
} from "../../dependencies";
import { toDateString } from "../../types/date-string";
import { createDynamoDBDocumentClient } from "../../utils/dynamo-client";
import {
  agentModelId,
  experimentName,
  judgeModelId,
  testAgentToolCalls,
  testId,
} from "../../utils/test-utils/agent-evals";
import { truncateAllTables } from "../../utils/test-utils/dynamodb-helpers";
import { fakeUser } from "../../utils/test-utils/models/user-fakes";
import { createMockLogger } from "../../utils/test-utils/providers/logger-mocks";
import { createAssistantAgent } from "./assistant-agent";

px.describe(
  "AssistantAgent",
  () => {
    const today = toDateString("2000-01-02");
    const userId = testId("current-user");

    let agent: ReturnType<typeof createAssistantAgent>;
    let context: { userId: string; today: string };

    beforeAll(async () => {
      agent = createAssistantAgent({
        model: await createChatModel(agentModelId),
        accountService: resolveAccountService(),
        aggregateTransactionsService: resolveAggregateTransactionsService(),
        categoryService: resolveCategoryService(),
        logger: createMockLogger(),
        transactionRepository: resolveTransactionRepository(),
        transactionService: resolveTransactionService(),
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

    px.test(
      "calls get_accounts when user asks to list accounts",
      {
        input: {
          message: "list my accounts",
          accounts: [{}],
        },
        expected: {
          toolCalls: [{ name: "get_accounts", args: {} }],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "calls get_categories when user asks to list categories",
      {
        input: {
          message: "what categories do I have?",
          accounts: [],
          categories: [{}],
        },
        expected: {
          toolCalls: [{ name: "get_categories", args: {} }],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "calls aggregate_transactions when user asks about total spending",
      {
        input: {
          message: "how much did I spend today?",
          accounts: [],
        },
        expected: {
          toolCalls: [
            {
              name: "aggregate_transactions",
              args: { startDate: today, endDate: today },
            },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "calls create_account when user asks to create account",
      {
        input: {
          message: "create a new account named Savings in EUR",
          accounts: [],
        },
        expected: {
          toolCalls: [
            {
              name: "create_account",
              args: { name: "Savings", currency: "EUR" },
            },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "calls create_category when user asks to create category",
      {
        input: {
          message: "create an expense category called Transport",
          accounts: [],
        },
        expected: {
          toolCalls: [
            {
              name: "create_category",
              args: { name: "Transport", type: "EXPENSE" },
            },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "calls update_account when user asks to rename account",
      {
        input: {
          message: "rename my Visa account to Amex",
          accounts: [{ id: testId("visa"), name: "Visa" }],
        },
        expected: {
          toolCalls: [
            {
              name: "update_account",
              args: { id: testId("visa"), name: "Amex" },
            },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "calls update_category when user asks to rename category",
      {
        input: {
          message: "rename Groceries category to Food",
          accounts: [],
          categories: [
            {
              id: testId("groceries"),
              type: "EXPENSE" as const,
              name: "Groceries",
            },
          ],
        },
        expected: {
          toolCalls: [
            {
              name: "update_category",
              args: { id: testId("groceries"), name: "Food" },
            },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "calls create_transaction_subagent when user logs transaction",
      {
        input: {
          message: "bought apples for 10 euro",
          accounts: [{ currency: "EUR" }],
        },
        expected: {
          // Subagent gets free text, so no args to compare
          toolCalls: [{ name: "create_transaction_subagent", args: {} }],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );
  },
  {
    experimentName,
    metadata: { agentModelId, judgeModelId },
  },
);
