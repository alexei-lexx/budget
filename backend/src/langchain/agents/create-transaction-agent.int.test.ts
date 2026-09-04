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
import { createDynamoDBDocumentClient } from "../../utils/dynamo-client";
import { truncateAllTables } from "../../utils/test-utils/dynamodb-helpers";
import { fakeAccount } from "../../utils/test-utils/models/account-fakes";
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
});
