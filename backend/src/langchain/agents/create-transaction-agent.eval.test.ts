import { randomUUID } from "crypto";
import { LangChainInstrumentation } from "@arizeai/openinference-instrumentation-langchain";
import * as px from "@arizeai/phoenix-client/vitest";
import * as CallbackManagerModule from "@langchain/core/callbacks/manager";
import { awaitAllCallbacks } from "@langchain/core/callbacks/promises";
import { Temporal } from "temporal-polyfill";
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
import { TransactionType } from "../../models/transaction";
import { DateString, toDateString } from "../../types/date-string";
import { createDynamoDBDocumentClient } from "../../utils/dynamo-client";
import {
  agentModelId,
  experimentName,
  judgeModelId,
  testAgentNoTransactionCreated,
  testAgentToolCalls,
  testAgentWithJudge,
  testId,
} from "../../utils/test-utils/agent-evals";
import { truncateAllTables } from "../../utils/test-utils/dynamodb-helpers";
import { fakeUser } from "../../utils/test-utils/models/user-fakes";
import { createMockLogger } from "../../utils/test-utils/providers/logger-mocks";
import { CREATE_TRANSACTION_TOOL_NAME } from "../tools/create-transaction";
import { createCreateTransactionAgent } from "./create-transaction-agent";

px.describe(
  "CreateTransactionAgent",
  () => {
    const today = toDateString("2000-01-02");
    const userId = testId("current-user");

    let agent: ReturnType<typeof createCreateTransactionAgent>;
    let context: { userId: string; today: string };

    beforeAll(async () => {
      agent = createCreateTransactionAgent({
        model: await createChatModel(agentModelId),
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

    px.test(
      "creates expense transaction",
      {
        input: {
          message: "bought apples for 10 euro",
          accounts: [{ id: testId("default"), currency: "EUR" }],
          categories: [
            {
              id: testId("groceries"),
              type: "EXPENSE" as const,
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
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "creates expense transaction from amount breakdown",
      {
        input: {
          message: "bought apples for 10 and pears for 5 euro",
          accounts: [{ id: testId("default"), currency: "EUR" }],
          categories: [
            {
              id: testId("groceries"),
              type: "EXPENSE" as const,
              name: "groceries",
            },
          ],
        },
        expected: {
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
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "creates expense transaction by default",
      {
        input: {
          // No explicit "bought" or "spent" verb
          message: "apples 10 euro",
          accounts: [{ currency: "EUR" }],
        },
        expected: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { type: TransactionType.EXPENSE },
            },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "creates income transaction",
      {
        input: {
          message: "received salary of 1000 euro",
          accounts: [{ id: testId("default"), currency: "EUR" }],
          categories: [
            {
              id: testId("salary"),
              type: "INCOME" as const,
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
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "creates income transaction from amount breakdown",
      {
        input: {
          message: "received salary 1000 with bonus 200 euro on top",
          accounts: [{ id: testId("default"), currency: "EUR" }],
          categories: [
            {
              id: testId("salary"),
              type: "INCOME" as const,
              name: "salary",
            },
          ],
        },
        expected: {
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
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "creates refund transaction",
      {
        input: {
          message: "got a refund of 50 euro for shoes",
          accounts: [{ id: testId("default"), currency: "EUR" }],
          categories: [
            {
              id: testId("shoes"),
              type: "EXPENSE" as const,
              name: "shoes",
            },
          ],
        },
        expected: {
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
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "creates refund transaction from amount breakdown",
      {
        input: {
          message: "got a refund for boots 50 and sneakers 30 euro",
          accounts: [{ id: testId("default"), currency: "EUR" }],
          categories: [
            {
              id: testId("shoes"),
              type: "EXPENSE" as const,
              name: "shoes",
            },
          ],
        },
        expected: {
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
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "fetches active accounts and active categories to create transaction",
      {
        input: {
          message: "bought apples for 10 euro",
          accounts: [{ currency: "EUR" }],
        },
        expected: {
          toolCalls: [
            { name: "get_accounts", args: { scope: "ACTIVE" } },
            { name: "get_categories", args: { scope: "ACTIVE" } },
            { name: CREATE_TRANSACTION_TOOL_NAME, args: {} },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "infers account by currency",
      {
        input: {
          message: "bought apples for 50 pounds",
          accounts: [
            { currency: "EUR" },
            { id: testId("gbp"), currency: "GBP" },
            { currency: "USD" },
          ],
        },
        expected: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { accountId: testId("gbp") },
            },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "selects account by name",
      {
        input: {
          message: "bought apples for 50 in cash",
          accounts: [
            { name: "My Visa", currency: "EUR" },
            { id: testId("cash"), name: "My Cash", currency: "EUR" },
          ],
        },
        expected: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { accountId: testId("cash") },
            },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "selects most used account for category",
      {
        input: {
          message: "bought apples for 50 euro",
          accounts: [
            { id: testId("cash"), name: "cash", currency: "EUR" },
            { id: testId("card"), name: "card", currency: "EUR" },
          ],
          categories: [
            {
              id: testId("groceries"),
              type: "EXPENSE" as const,
              name: "groceries",
            },
            {
              id: testId("transport"),
              type: "EXPENSE" as const,
              name: "transport",
            },
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
        expected: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { accountId: testId("card") },
            },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "selects most used account overall",
      {
        input: {
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
        expected: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { accountId: testId("account-b") },
            },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "selects category by name",
      {
        input: {
          message: "bought groceries for 10 euros",
          accounts: [{ currency: "EUR" }],
          categories: [
            {
              id: testId("groceries"),
              type: "EXPENSE" as const,
              name: "groceries",
            },
            { type: "EXPENSE" as const, name: "household" },
          ],
        },
        expected: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { categoryId: testId("groceries") },
            },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "selects category by signal",
      {
        input: {
          message: "bought detergents for 10 euro",
          accounts: [{ currency: "EUR" }],
          categories: [
            { type: "EXPENSE" as const, name: "groceries" },
            {
              id: testId("household"),
              type: "EXPENSE" as const,
              name: "household",
            },
          ],
        },
        expected: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { categoryId: testId("household") },
            },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "leaves category blank when no match",
      {
        input: {
          message: "bought apples for 10 euro",
          accounts: [{ currency: "EUR" }],
          categories: [
            { type: "EXPENSE" as const, name: "electronics" },
            { type: "EXPENSE" as const, name: "household" },
          ],
        },
        expected: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { categoryId: undefined },
            },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "produces description that only lists purchased items",
      {
        input: {
          message:
            "bought a used mountain bike and waterproof bike bags for 200 euro",
          accounts: [{ currency: "EUR" }],
        },
        expected: {
          criteria: `Description must list only the purchased items
          (a used mountain bike, waterproof bike bags),
          may contain conjunctions, and nothing else.`,
        },
      },
      (args) => testAgentWithJudge({ agent, context, userId }, args),
    );

    px.test(
      "skips description that equals category name",
      {
        input: {
          message: "purchased groceries for 50 euro",
          accounts: [{ currency: "EUR" }],
          categories: [{ type: "EXPENSE" as const, name: "groceries" }],
        },
        expected: {
          criteria: `Description must be empty
          because the purchased item "groceries"
          equals the category name.

          "Description: N/A" in the agent's response means an empty description.`,
        },
      },
      (args) => testAgentWithJudge({ agent, context, userId }, args),
    );

    px.test(
      "skips description that equals translated category name",
      {
        input: {
          message: "Lebensmittel für 50 Euro gekauft",
          accounts: [{ currency: "EUR" }],
          categories: [{ type: "EXPENSE" as const, name: "groceries" }],
        },
        expected: {
          criteria: `Description must be empty
          because the purchased item "Lebensmittel"
          is the German translation of the category name "groceries".

          "Description: N/A" in the agent's response means an empty description.`,
        },
      },
      (args) => testAgentWithJudge({ agent, context, userId }, args),
    );

    px.test(
      "creates one transaction from amount breakdown across categories",
      {
        input: {
          message: "meat 5 and shampoo 3 euro",
          accounts: [{ currency: "EUR" }],
          categories: [
            { type: "EXPENSE" as const, name: "groceries" },
            { type: "EXPENSE" as const, name: "household" },
          ],
        },
        expected: {
          toolCalls: [
            { name: "sum", args: {} },
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { amount: 8 },
            },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "creates transaction from decimal amount breakdown",
      {
        input: {
          message: "bread 1.29, cheese 3.45, butter 2.19 euro",
          accounts: [{ currency: "EUR" }],
        },
        expected: {
          toolCalls: [
            { name: "sum", args: {} },
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { amount: 6.93 },
            },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "creates transaction from written amount breakdown",
      {
        input: {
          message: "coffee two euros and croissant three fifty",
          accounts: [{ currency: "EUR" }],
        },
        expected: {
          toolCalls: [
            { name: "sum", args: {} },
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { amount: 5.5 },
            },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "does not treat quantity as amount breakdown",
      {
        input: {
          message: "2 kg of apples for 5 euro",
          accounts: [{ currency: "EUR" }],
        },
        expected: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { amount: 5 },
            },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "does not create transaction for alternative amounts",
      {
        input: {
          message: "paid 10 or 20 euros",
          accounts: [{ currency: "EUR" }],
        },
      },
      (args) => testAgentNoTransactionCreated({ agent, context, userId }, args),
    );

    px.test(
      "keeps suspiciously high amount from voice input without price history",
      {
        input: {
          message: "sandwich 987",
          accounts: [{ currency: "EUR" }],
          isVoiceInput: true,
        },
        expected: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { amount: 987 },
            },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "corrects suspiciously high amount from voice input using price history",
      {
        input: {
          message: "sandwich 987",
          accounts: [{ id: testId("default"), currency: "EUR" }],
          categories: [
            { id: testId("food"), type: "EXPENSE" as const, name: "food" },
          ],
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
        expected: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { amount: 9.87 },
            },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "keeps suspiciously high amount from keyboard input despite price history",
      {
        input: {
          message: "sandwich 987",
          accounts: [{ id: testId("default"), currency: "EUR" }],
          categories: [
            { id: testId("food"), type: "EXPENSE" as const, name: "food" },
          ],
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
        expected: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { amount: 987 },
            },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "parses bare HH:MM as amount under voice input",
      {
        input: {
          message: "11:23",
          accounts: [{ currency: "EUR" }],
          isVoiceInput: true,
        },
        expected: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { amount: 11.23 },
            },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "parses HH:MM in mixed text as amount under voice input",
      {
        input: {
          message: "groceries 7:50",
          accounts: [{ currency: "EUR" }],
          isVoiceInput: true,
        },
        expected: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { amount: 7.5 },
            },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "parses HH:MM as amount when preposition refers to place under voice input",
      {
        input: {
          message: "lunch 11:23 at cafe",
          accounts: [{ currency: "EUR" }],
          isVoiceInput: true,
        },
        expected: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { amount: 11.23 },
            },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "prefers explicit amount over HH:MM under voice input",
      {
        input: {
          message: "paid 100 at 15:30",
          accounts: [{ currency: "EUR" }],
          isVoiceInput: true,
        },
        expected: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { amount: 100 },
            },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "does not create transaction when HH:MM is clock time under voice input",
      {
        input: {
          message: "I bought coffee at 12:34",
          accounts: [{ currency: "EUR" }],
          isVoiceInput: true,
        },
      },
      (args) => testAgentNoTransactionCreated({ agent, context, userId }, args),
    );

    px.test(
      "does not create transaction for bare HH:MM under keyboard input",
      {
        input: {
          message: "11:23",
          accounts: [{ currency: "EUR" }],
          isVoiceInput: false,
        },
      },
      (args) => testAgentNoTransactionCreated({ agent, context, userId }, args),
    );

    px.test(
      "parses NN NN as amount under voice input",
      {
        input: {
          message: "apples, bananas 12 54",
          accounts: [{ currency: "EUR" }],
          isVoiceInput: true,
        },
        expected: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { amount: 12.54 },
            },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "parses NN N as amount with leading zero under voice input",
      {
        input: {
          message: "coffee 12 5",
          accounts: [{ currency: "EUR" }],
          isVoiceInput: true,
        },
        expected: {
          toolCalls: [
            {
              name: CREATE_TRANSACTION_TOOL_NAME,
              args: { amount: 12.05 },
            },
          ],
        },
      },
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "does not create transaction for NN NN under keyboard input",
      {
        input: {
          message: "apples, bananas 12 54",
          accounts: [{ currency: "EUR" }],
          isVoiceInput: false,
        },
      },
      (args) => testAgentNoTransactionCreated({ agent, context, userId }, args),
    );

    px.test(
      "creates transaction from same-amount recurring matches",
      {
        input: {
          message: "gym",
          accounts: [{ id: testId("default"), currency: "EUR" }],
          categories: [{ id: testId("sport"), type: "EXPENSE" as const }],
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
        expected: {
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
      (args) => testAgentToolCalls({ agent, context, userId }, args),
    );

    px.test(
      "does not create transaction from varying-amount recurring matches",
      {
        input: {
          message: "gym",
          accounts: [{ id: testId("default"), currency: "EUR" }],
          categories: [{ id: testId("sport"), type: "EXPENSE" as const }],
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
      (args) => testAgentNoTransactionCreated({ agent, context, userId }, args),
    );

    px.test(
      "does not create transaction from single prior match",
      {
        input: {
          message: "gym",
          accounts: [{ id: testId("default"), currency: "EUR" }],
          categories: [{ id: testId("sport"), type: "EXPENSE" as const }],
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
      (args) => testAgentNoTransactionCreated({ agent, context, userId }, args),
    );

    px.test(
      "does not create transaction without prior matches",
      {
        input: {
          message: "gym",
          accounts: [{ id: testId("default"), currency: "EUR" }],
          categories: [
            { id: testId("food"), type: "EXPENSE" as const, name: "food" },
          ],
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
      (args) => testAgentNoTransactionCreated({ agent, context, userId }, args),
    );

    px.test(
      "does not create transaction when user has no accounts",
      {
        input: {
          message: "bought apples for 10 euro",
          accounts: [],
        },
      },
      (args) => testAgentNoTransactionCreated({ agent, context, userId }, args),
    );
  },
  {
    experimentName,
    metadata: { agentModelId, judgeModelId },
  },
);

// Returns date that is given number of days before today
function daysAgo(days: number, today: DateString) {
  return toDateString(
    Temporal.PlainDate.from(today).subtract({ days }).toString(),
  );
}
