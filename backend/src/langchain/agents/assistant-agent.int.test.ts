import { beforeEach, describe, expect, it } from "@jest/globals";
import { AIMessage, HumanMessage } from "langchain";
import {
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
import { toDateString } from "../../types/date";
import { createBedrockChatModel } from "../../utils/bedrock";
import { formatDateAsYYYYMMDD } from "../../utils/date";
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

const agent = createAssistantAgent({
  model: createBedrockChatModel(),
  accountRepository,
  accountService,
  categoryRepository,
  categoryService,
  transactionRepository,
  transactionService,
});

describe("AssistantAgent (integration)", () => {
  let context: { userId: string; today: string };
  let today: string;
  let userId: string;

  beforeEach(async () => {
    await truncateAllTables(createDynamoDBDocumentClient());

    const user = await userRepository.create(fakeUser());
    userId = user.id;

    today = formatDateAsYYYYMMDD(new Date());
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
    const toolNames = response.messages
      .filter(AIMessage.isInstance)
      .flatMap((message) => message.tool_calls ?? [])
      .map((toolCall) => toolCall.name);
    expect(toolNames).toContain("get_accounts");
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
    const toolNames = response.messages
      .filter(AIMessage.isInstance)
      .flatMap((message) => message.tool_calls ?? [])
      .map((toolCall) => toolCall.name);
    expect(toolNames).toContain("get_categories");
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
    const toolNames = response.messages
      .filter(AIMessage.isInstance)
      .flatMap((message) => message.tool_calls ?? [])
      .map((toolCall) => toolCall.name);
    expect(toolNames).toContain("aggregate_transactions");
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

    const lastToolCallMessage = response.messages.findLast(
      (message): message is AIMessage =>
        AIMessage.isInstance(message) && (message.tool_calls ?? []).length > 0,
    );
    expect(lastToolCallMessage).toHaveToolCalls([
      {
        name: "create_account",
        args: expect.objectContaining({
          name: expect.stringMatching(/savings/i),
          currency: "EUR",
        }),
      },
    ]);
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

    const lastToolCallMessage = response.messages.findLast(
      (message): message is AIMessage =>
        AIMessage.isInstance(message) && (message.tool_calls ?? []).length > 0,
    );
    expect(lastToolCallMessage).toHaveToolCalls([
      {
        name: "create_category",
        args: expect.objectContaining({
          name: expect.stringMatching(/transport/i),
          type: CategoryType.EXPENSE,
        }),
      },
    ]);
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
    const persistedAccount = await accountRepository.findOneById({
      id: account.id,
      userId,
    });
    expect(persistedAccount?.name).toEqual(expect.stringMatching(/amex/i));

    const lastToolCallMessage = response.messages.findLast(
      (message): message is AIMessage =>
        AIMessage.isInstance(message) && (message.tool_calls ?? []).length > 0,
    );
    expect(lastToolCallMessage).toHaveToolCalls([
      {
        name: "update_account",
        args: expect.objectContaining({
          id: account.id,
          name: expect.stringMatching(/amex/i),
        }),
      },
    ]);
  });

  it("calls update_category when user asks to rename category", async () => {
    // Arrange
    const category = await categoryRepository.create(
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
    const persistedCategory = await categoryRepository.findOneById({
      id: category.id,
      userId,
    });
    expect(persistedCategory?.name).toEqual(expect.stringMatching(/food/i));

    const lastToolCallMessage = response.messages.findLast(
      (message): message is AIMessage =>
        AIMessage.isInstance(message) && (message.tool_calls ?? []).length > 0,
    );
    expect(lastToolCallMessage).toHaveToolCalls([
      {
        name: "update_category",
        args: expect.objectContaining({
          id: category.id,
          name: expect.stringMatching(/food/i),
        }),
      },
    ]);
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
    const toolNames = response.messages
      .filter(AIMessage.isInstance)
      .flatMap((message) => message.tool_calls ?? [])
      .map((toolCall) => toolCall.name);
    expect(toolNames).toContain("create_transaction_subagent");
  });
});
