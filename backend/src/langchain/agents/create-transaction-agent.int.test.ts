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
import { toDateString } from "../../types/date-string";
import { createDynamoDBDocumentClient } from "../../utils/dynamo-client";
import { truncateAllTables } from "../../utils/test-utils/dynamodb-helpers";
import { fakeAccount } from "../../utils/test-utils/models/account-fakes";
import { fakeCategory } from "../../utils/test-utils/models/category-fakes";
import { fakeExpense } from "../../utils/test-utils/models/transaction-fakes";
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

describe("CreateTransactionAgent (integration)", () => {
  let context: { userId: string; today: string; isVoiceInput?: boolean };
  let today: string;
  let userId: string;
  let agent: ReturnType<typeof createCreateTransactionAgent>;

  beforeAll(async () => {
    agent = createCreateTransactionAgent({
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

  // Happy path

  it("creates transaction when expense is given", async () => {
    // Arrange
    await accountRepository.create(fakeAccount({ userId, currency: "EUR" }));
    await categoryRepository.create(
      fakeCreateCategoryInput({
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

    const aiMessage = response.messages.findLast(
      (message) => AIMessage.isInstance(message) && message.tool_calls?.length,
    );
    expect(aiMessage).toContainToolCall({ name: CREATE_TRANSACTION_TOOL_NAME });
  });

  it("creates transaction when income is given", async () => {
    // Arrange
    await accountRepository.create(fakeAccount({ userId, currency: "EUR" }));
    await categoryRepository.create(
      fakeCreateCategoryInput({
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

    const aiMessage = response.messages.findLast(
      (message) => AIMessage.isInstance(message) && message.tool_calls?.length,
    );
    expect(aiMessage).toContainToolCall({ name: CREATE_TRANSACTION_TOOL_NAME });
  });

  it("creates transaction when refund is given", async () => {
    // Arrange
    await accountRepository.create(fakeAccount({ userId, currency: "EUR" }));
    await categoryRepository.create(
      fakeCreateCategoryInput({
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

    const aiMessage = response.messages.findLast(
      (message) => AIMessage.isInstance(message) && message.tool_calls?.length,
    );
    expect(aiMessage).toContainToolCall({ name: CREATE_TRANSACTION_TOOL_NAME });
  });

  // Validation failures

  it("does not create transaction when user has no accounts", async () => {
    // Act
    const response = await agent.invoke(
      { messages: [new HumanMessage("bought apples for 10 euro")] },
      { context },
    );

    // Assert
    const transactions = await transactionRepository.findManyByUserId(userId);
    expect(transactions).toHaveLength(0);

    const aiMessage = response.messages.findLast(
      (message) => AIMessage.isInstance(message) && message.tool_calls?.length,
    );
    expect(aiMessage).not.toContainToolCall({
      name: CREATE_TRANSACTION_TOOL_NAME,
    });
  });

  describe("when amount is not given", () => {
    // Validation failures

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
  });

  describe("when message contains HH:MM-shaped string", () => {
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
    // Validation failures

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
