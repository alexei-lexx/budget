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
import { fakeTransaction } from "../../utils/test-utils/models/transaction-fakes";
import { fakeUser } from "../../utils/test-utils/models/user-fakes";
import { createAssistantAgent } from "./assistant-agent";

const accountRepository = resolveAccountRepository();
const accountService = resolveAccountService();
const categoryRepository = resolveCategoryRepository();
const categoryService = resolveCategoryService();
const transactionRepository = resolveTransactionRepository();
const transactionService = resolveTransactionService();
const userRepository = resolveUserRepository();

describe("AssistantAgent (integration)", () => {
  let context: { userId: string; today: string };
  let today: string;
  let userId: string;
  let agent: ReturnType<typeof createAssistantAgent>;

  beforeAll(async () => {
    agent = createAssistantAgent({
      model: await createChatModel(),
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

  // Happy path — reads

  it("calls get_accounts when user asks to list accounts", async () => {
    // Arrange
    await accountRepository.create(fakeAccount({ userId }));

    // Act
    const response = await agent.invoke(
      { messages: [new HumanMessage("list my accounts")] },
      { context },
    );

    // Assert
    const aiMessage = response.messages.findLast(
      (message) => AIMessage.isInstance(message) && message.tool_calls?.length,
    );
    expect(aiMessage).toContainToolCall({ name: "get_accounts" });
  });

  it("calls get_categories when user asks to list categories", async () => {
    // Arrange
    await categoryRepository.create(fakeCategory({ userId }));

    // Act
    const response = await agent.invoke(
      { messages: [new HumanMessage("what categories do I have?")] },
      { context },
    );

    // Assert
    const aiMessage = response.messages.findLast(
      (message) => AIMessage.isInstance(message) && message.tool_calls?.length,
    );
    expect(aiMessage).toContainToolCall({ name: "get_categories" });
  });

  it("calls aggregate_transactions when user asks about total spending", async () => {
    // Arrange
    const account = fakeAccount({ userId });
    await accountRepository.create(account);
    await transactionRepository.create(
      fakeTransaction({
        userId,
        accountId: account.id,
        amount: 20,
        currency: "EUR",
        date: toDateString(today),
        type: TransactionType.EXPENSE,
      }),
    );
    await transactionRepository.create(
      fakeTransaction({
        userId,
        accountId: account.id,
        amount: 30,
        currency: "EUR",
        date: toDateString(today),
        type: TransactionType.EXPENSE,
      }),
    );

    // Act
    const response = await agent.invoke(
      { messages: [new HumanMessage("how much did I spend today?")] },
      { context },
    );

    // Assert
    const aiMessage = response.messages.findLast(
      (message) => AIMessage.isInstance(message) && message.tool_calls?.length,
    );
    expect(aiMessage).toContainToolCall({
      name: "aggregate_transactions",
    });
  });

  // Happy path — writes

  it("calls create_account when user asks to create account", async () => {
    // Act
    const response = await agent.invoke(
      {
        messages: [
          new HumanMessage("create a new account named Savings in EUR"),
        ],
      },
      { context },
    );

    // Assert
    const accounts = await accountRepository.findManyByUserId(userId);
    expect(accounts).toHaveLength(1);

    const aiMessage = response.messages.findLast(
      (message) => AIMessage.isInstance(message) && message.tool_calls?.length,
    );
    expect(aiMessage).toContainToolCall({ name: "create_account" });
  });

  it("calls create_category when user asks to create category", async () => {
    // Act
    const response = await agent.invoke(
      {
        messages: [
          new HumanMessage("create an expense category called Transport"),
        ],
      },
      { context },
    );

    // Assert
    const categories = await categoryRepository.findManyByUserId(userId);
    expect(categories).toHaveLength(1);

    const aiMessage = response.messages.findLast(
      (message) => AIMessage.isInstance(message) && message.tool_calls?.length,
    );
    expect(aiMessage).toContainToolCall({ name: "create_category" });
  });

  it("calls update_account when user asks to rename account", async () => {
    // Arrange
    const account = fakeAccount({ userId, name: "Visa" });
    await accountRepository.create(account);

    // Act
    const response = await agent.invoke(
      {
        messages: [new HumanMessage("rename my Visa account to Amex")],
      },
      { context },
    );

    // Assert
    const aiMessage = response.messages.findLast(
      (message) => AIMessage.isInstance(message) && message.tool_calls?.length,
    );
    expect(aiMessage).toContainToolCall({ name: "update_account" });
  });

  it("calls update_category when user asks to rename category", async () => {
    // Arrange
    await categoryRepository.create(
      fakeCategory({
        userId,
        type: CategoryType.EXPENSE,
        name: "Groceries",
      }),
    );

    // Act
    const response = await agent.invoke(
      {
        messages: [new HumanMessage("rename Groceries category to Food")],
      },
      { context },
    );

    // Assert
    const aiMessage = response.messages.findLast(
      (message) => AIMessage.isInstance(message) && message.tool_calls?.length,
    );
    expect(aiMessage).toContainToolCall({ name: "update_category" });
  });

  it("calls create_transaction_subagent when user logs transaction", async () => {
    // Arrange
    await accountRepository.create(fakeAccount({ userId, currency: "EUR" }));

    // Act
    const response = await agent.invoke(
      { messages: [new HumanMessage("bought apples for 10 euro")] },
      { context },
    );

    // Assert
    const aiMessage = response.messages.findLast(
      (message) => AIMessage.isInstance(message) && message.tool_calls?.length,
    );
    expect(aiMessage).toContainToolCall({
      name: "create_transaction_subagent",
    });
  });
});
