import { beforeEach, describe, expect, it } from "@jest/globals";
import { AIMessage, HumanMessage } from "langchain";
import {
  resolveAccountRepository,
  resolveCategoryRepository,
  resolveTransactionRepository,
  resolveTransactionService,
  resolveUserRepository,
} from "../../dependencies";
import { CategoryType } from "../../models/category";
import { TransactionType } from "../../models/transaction";
import { createBedrockChatModel } from "../../utils/bedrock";
import { formatDateAsYYYYMMDD } from "../../utils/date";
import { createDynamoDBDocumentClient } from "../../utils/dynamo-client";
import { truncateAllTables } from "../../utils/test-utils/dynamodb-helpers";
import { fakeAccount } from "../../utils/test-utils/models/account-fakes";
import { fakeCategory } from "../../utils/test-utils/models/category-fakes";
import { fakeTransaction } from "../../utils/test-utils/models/transaction-fakes";
import { fakeUser } from "../../utils/test-utils/models/user-fakes";
import { CREATE_TRANSACTION_TOOL_NAME } from "../tools/create-transaction";
import { createCreateTransactionAgent } from "./create-transaction-agent";

const accountRepository = resolveAccountRepository();
const categoryRepository = resolveCategoryRepository();
const transactionRepository = resolveTransactionRepository();
const transactionService = resolveTransactionService();
const userRepository = resolveUserRepository();

const agent = createCreateTransactionAgent({
  model: createBedrockChatModel(),
  accountRepository,
  categoryRepository,
  transactionRepository,
  transactionService,
});

describe("CreateTransactionAgent (integration)", () => {
  let context: { userId: string; today: string; isVoiceInput?: boolean };
  let today: string;
  let userId: string;

  beforeEach(async () => {
    await truncateAllTables(createDynamoDBDocumentClient());

    const user = await userRepository.create(fakeUser());
    userId = user.id;

    today = formatDateAsYYYYMMDD(new Date());
    context = { userId, today };
  });

  // Happy path

  it("calls create_transaction when expense is given", async () => {
    // Arrange
    const account = await accountRepository.create(
      fakeAccount({ userId, currency: "EUR" }),
    );
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
    const transactions = await transactionRepository.findManyByUserId(userId);
    expect(transactions).toHaveLength(1);

    const lastToolCallMessage = response.messages.findLast(
      (message): message is AIMessage =>
        AIMessage.isInstance(message) && (message.tool_calls ?? []).length > 0,
    );
    expect(lastToolCallMessage).toHaveToolCalls([
      {
        name: CREATE_TRANSACTION_TOOL_NAME,
        args: expect.objectContaining({
          accountId: account.id,
          amount: 10,
          categoryId: category.id,
          date: today,
          type: TransactionType.EXPENSE,
        }),
      },
    ]);
  });

  it("calls create_transaction when income is given", async () => {
    // Arrange
    const account = await accountRepository.create(
      fakeAccount({ userId, currency: "EUR" }),
    );
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
    const transactions = await transactionRepository.findManyByUserId(userId);
    expect(transactions).toHaveLength(1);

    const lastToolCallMessage = response.messages.findLast(
      (message): message is AIMessage =>
        AIMessage.isInstance(message) && (message.tool_calls ?? []).length > 0,
    );
    expect(lastToolCallMessage).toHaveToolCalls([
      {
        name: CREATE_TRANSACTION_TOOL_NAME,
        args: expect.objectContaining({
          accountId: account.id,
          amount: 1000,
          categoryId: category.id,
          date: today,
          type: TransactionType.INCOME,
        }),
      },
    ]);
  });

  it("calls create_transaction when refund is given", async () => {
    // Arrange
    const account = await accountRepository.create(
      fakeAccount({ userId, currency: "EUR" }),
    );
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
    const transactions = await transactionRepository.findManyByUserId(userId);
    expect(transactions).toHaveLength(1);

    const lastToolCallMessage = response.messages.findLast(
      (message): message is AIMessage =>
        AIMessage.isInstance(message) && (message.tool_calls ?? []).length > 0,
    );
    expect(lastToolCallMessage).toHaveToolCalls([
      {
        name: CREATE_TRANSACTION_TOOL_NAME,
        args: expect.objectContaining({
          accountId: account.id,
          amount: 50,
          categoryId: category.id,
          date: today,
          type: TransactionType.REFUND,
        }),
      },
    ]);
  });

  it("uses amount as transcribed when no similar transaction history exists", async () => {
    // Arrange
    await accountRepository.create(fakeAccount({ userId }));

    // Act
    const response = await agent.invoke(
      { messages: [new HumanMessage("sandwich 987")] },
      { context: { ...context, isVoiceInput: true } },
    );

    // Assert
    const transactions = await transactionRepository.findManyByUserId(userId);
    expect(transactions).toHaveLength(1);

    const lastToolCallMessage = response.messages.findLast(
      (message): message is AIMessage =>
        AIMessage.isInstance(message) && (message.tool_calls ?? []).length > 0,
    );
    expect(lastToolCallMessage).toHaveToolCalls([
      {
        name: CREATE_TRANSACTION_TOOL_NAME,
        args: expect.objectContaining({ amount: 987 }),
      },
    ]);
  });

  it("corrects collapsed amount when similar transaction history suggests much smaller price", async () => {
    // Arrange
    const account = await accountRepository.create(fakeAccount({ userId }));
    const category = await categoryRepository.create(
      fakeCategory({
        userId,
        type: CategoryType.EXPENSE,
        name: "food",
      }),
    );
    // Seed similar history — prior "food" expenses around 5–15 EUR
    await transactionRepository.createMany([
      fakeTransaction({
        userId,
        accountId: account.id,
        categoryId: category.id,
        amount: 5,
        type: TransactionType.EXPENSE,
      }),
      fakeTransaction({
        userId,
        accountId: account.id,
        categoryId: category.id,
        amount: 15,
        type: TransactionType.EXPENSE,
      }),
    ]);

    // Act
    const response = await agent.invoke(
      { messages: [new HumanMessage("sandwich 987")] },
      { context: { ...context, isVoiceInput: true } },
    );

    // Assert
    const transactions = await transactionRepository.findManyByUserId(userId);
    expect(transactions).toHaveLength(3);

    const lastToolCallMessage = response.messages.findLast(
      (message): message is AIMessage =>
        AIMessage.isInstance(message) && (message.tool_calls ?? []).length > 0,
    );
    expect(lastToolCallMessage).toHaveToolCalls([
      {
        name: CREATE_TRANSACTION_TOOL_NAME,
        args: expect.objectContaining({ amount: 9.87 }),
      },
    ]);
  });

  // Validation failures

  it("does not call create_transaction when user has no accounts", async () => {
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
    expect(toolNames).not.toContain(CREATE_TRANSACTION_TOOL_NAME);
  });

  it("does not call create_transaction when amount is not given", async () => {
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
});
