import { faker } from "@faker-js/faker";
import { AIMessage, HumanMessage } from "langchain";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createChatModel,
  resolveAccountRepository,
  resolveCategoryRepository,
  resolveTransactionRepository,
  resolveTransactionService,
  resolveUserRepository,
} from "../../dependencies";
import { CategoryType } from "../../models/category";
import { TransactionType } from "../../models/transaction";
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

describe("CreateTransactionAgent (integration)", () => {
  let context: { userId: string; today: string; isVoiceInput?: boolean };
  let today: string;
  let userId: string;
  let agent: ReturnType<typeof createCreateTransactionAgent>;

  beforeAll(async () => {
    agent = createCreateTransactionAgent({
      model: await createChatModel(),
      accountRepository,
      categoryRepository,
      transactionRepository,
      transactionService,
    });
  });

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

  describe("when amount is suspiciously high", () => {
    // Happy path

    it("does not correct amount under voice input when no similar history exists", async () => {
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
          AIMessage.isInstance(message) &&
          (message.tool_calls ?? []).length > 0,
      );
      expect(lastToolCallMessage).toHaveToolCalls([
        {
          name: CREATE_TRANSACTION_TOOL_NAME,
          args: expect.objectContaining({ amount: 987 }),
        },
      ]);
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
      const transactions = await transactionRepository.findManyByUserId(userId);
      expect(transactions).toHaveLength(existingTransactionCount + 1);

      const lastToolCallMessage = response.messages.findLast(
        (message): message is AIMessage =>
          AIMessage.isInstance(message) &&
          (message.tool_calls ?? []).length > 0,
      );
      expect(lastToolCallMessage).toHaveToolCalls([
        {
          name: CREATE_TRANSACTION_TOOL_NAME,
          args: expect.objectContaining({ amount: 9.87 }),
        },
      ]);
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
      const lastToolCallMessage = response.messages.findLast(
        (message): message is AIMessage =>
          AIMessage.isInstance(message) &&
          (message.tool_calls ?? []).length > 0,
      );
      expect(lastToolCallMessage).toHaveToolCalls([
        {
          name: CREATE_TRANSACTION_TOOL_NAME,
          args: expect.objectContaining({ amount: 987 }),
        },
      ]);
    });
  });

  describe("when message contains HH:MM-shaped string", () => {
    // Happy path

    it("treats bare HH:MM string as price under voice input", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId }));

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("11:23")] },
        { context: { ...context, isVoiceInput: true } },
      );

      // Assert
      const lastToolCallMessage = response.messages.findLast(
        (message): message is AIMessage =>
          AIMessage.isInstance(message) &&
          (message.tool_calls ?? []).length > 0,
      );
      expect(lastToolCallMessage).toHaveToolCalls([
        {
          name: CREATE_TRANSACTION_TOOL_NAME,
          args: expect.objectContaining({ amount: 11.23 }),
        },
      ]);
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
      const lastToolCallMessage = response.messages.findLast(
        (message): message is AIMessage =>
          AIMessage.isInstance(message) &&
          (message.tool_calls ?? []).length > 0,
      );
      expect(lastToolCallMessage).toHaveToolCalls([
        {
          name: CREATE_TRANSACTION_TOOL_NAME,
          args: expect.objectContaining({ amount: 7.5 }),
        },
      ]);
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
      const lastToolCallMessage = response.messages.findLast(
        (message): message is AIMessage =>
          AIMessage.isInstance(message) &&
          (message.tool_calls ?? []).length > 0,
      );
      expect(lastToolCallMessage).toHaveToolCalls([
        {
          name: CREATE_TRANSACTION_TOOL_NAME,
          args: expect.objectContaining({ amount: 11.23 }),
        },
      ]);
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
      const lastToolCallMessage = response.messages.findLast(
        (message): message is AIMessage =>
          AIMessage.isInstance(message) &&
          (message.tool_calls ?? []).length > 0,
      );
      expect(lastToolCallMessage).toHaveToolCalls([
        {
          name: CREATE_TRANSACTION_TOOL_NAME,
          args: expect.objectContaining({ amount: 100 }),
        },
      ]);
    });

    // Validation failures

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
    // Happy path

    it("treats two-digit fractional part as decimal amount under voice input", async () => {
      // Arrange
      await accountRepository.create(fakeAccount({ userId }));

      // Act
      const response = await agent.invoke(
        { messages: [new HumanMessage("apples, bananas 12 54")] },
        { context: { ...context, isVoiceInput: true } },
      );

      // Assert
      const lastToolCallMessage = response.messages.findLast(
        (message): message is AIMessage =>
          AIMessage.isInstance(message) &&
          (message.tool_calls ?? []).length > 0,
      );
      expect(lastToolCallMessage).toHaveToolCalls([
        {
          name: CREATE_TRANSACTION_TOOL_NAME,
          args: expect.objectContaining({ amount: 12.54 }),
        },
      ]);
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
      const lastToolCallMessage = response.messages.findLast(
        (message): message is AIMessage =>
          AIMessage.isInstance(message) &&
          (message.tool_calls ?? []).length > 0,
      );
      expect(lastToolCallMessage).toHaveToolCalls([
        {
          name: CREATE_TRANSACTION_TOOL_NAME,
          args: expect.objectContaining({ amount: 12.05 }),
        },
      ]);
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
});
