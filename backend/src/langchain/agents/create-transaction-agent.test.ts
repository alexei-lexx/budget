import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AIMessage, ToolMessage, fakeModel } from "langchain";
import { TransactionType } from "../../models/transaction";
import { TransactionService } from "../../services/transaction-service";
import { fakeTransaction } from "../../utils/test-utils/models/transaction-fakes";
import { createMockAccountRepository } from "../../utils/test-utils/repositories/account-repository-mocks";
import { createMockCategoryRepository } from "../../utils/test-utils/repositories/category-repository-mocks";
import { createMockTransactionRepository } from "../../utils/test-utils/repositories/transaction-repository-mocks";
import { CREATE_TRANSACTION_TOOL_NAME } from "../tools/create-transaction";
import {
  VOICE_INPUT_INDICATOR,
  createCreateTransactionAgent,
} from "./create-transaction-agent";

describe("createCreateTransactionAgent", () => {
  let agent: ReturnType<typeof createCreateTransactionAgent>;
  let mockModel: ReturnType<typeof fakeModel>;
  let mockTransactionService: jest.Mocked<
    Pick<TransactionService, "createTransaction">
  >;

  const baseContext = {
    today: "2000-01-02",
    userId: faker.string.uuid(),
  };

  const messages = [{ role: "user", content: "coffee $5" }];

  beforeEach(() => {
    jest.clearAllMocks();

    mockModel = fakeModel();
    mockTransactionService = { createTransaction: jest.fn() };

    agent = createCreateTransactionAgent({
      model: mockModel,
      accountRepository: createMockAccountRepository(),
      categoryRepository: createMockCategoryRepository(),
      transactionRepository: createMockTransactionRepository(),
      transactionService:
        mockTransactionService as unknown as TransactionService,
    });
  });

  // Happy path

  it("should create transaction", async () => {
    // Arrange
    const createdTransaction = fakeTransaction();

    // Persists and returns created transaction
    mockTransactionService.createTransaction.mockResolvedValue(
      createdTransaction,
    );

    // Model calls create_transaction tool
    mockModel.respondWithTools([
      {
        name: CREATE_TRANSACTION_TOOL_NAME,
        args: {
          amount: 5,
          accountId: faker.string.uuid(),
          date: "2000-01-02",
          type: TransactionType.EXPENSE,
        },
      },
    ]);

    // Model emits final text after tool result
    mockModel.respond(new AIMessage("Transaction created successfully"));

    // Act
    const result = await agent.invoke({ messages }, { context: baseContext });

    // Assert
    const lastMessage = result.messages.at(-1);
    expect(lastMessage?.content).toContain("Transaction created successfully");
    expect(mockTransactionService.createTransaction).toHaveBeenCalledTimes(1);
  });

  it("should include today's date in system prompt", async () => {
    // Arrange

    // Model emits final text without tool calls
    mockModel.respond(new AIMessage("OK"));

    // Act
    await agent.invoke({ messages }, { context: baseContext });

    // Assert
    expect(mockModel.calls[0].messages[0].content).toContain(
      "Today is 2000-01-02.",
    );
  });

  it("should not include voice input indicator in system prompt when isVoiceInput is false", async () => {
    // Arrange
    const context = {
      ...baseContext,
      isVoiceInput: false,
    };

    // Model emits final text without tool calls
    mockModel.respond(new AIMessage("OK"));

    // Act
    await agent.invoke({ messages }, { context });

    // Assert
    expect(mockModel.calls[0].messages[0].content).not.toContain(
      VOICE_INPUT_INDICATOR,
    );
  });

  it("should include voice input indicator in system prompt when isVoiceInput is true", async () => {
    // Arrange
    const context = {
      ...baseContext,
      isVoiceInput: true,
    };

    // Model emits final text without tool calls
    mockModel.respond(new AIMessage("OK"));

    // Act
    await agent.invoke({ messages }, { context });

    // Assert
    expect(mockModel.calls[0].messages[0].content).toContain(
      VOICE_INPUT_INDICATOR,
    );
  });

  // Validation failures

  it("should block second creation tool call within same invocation", async () => {
    // Arrange
    const createdTransaction = fakeTransaction();
    const toolCall = {
      name: CREATE_TRANSACTION_TOOL_NAME,
      args: {
        amount: 5,
        accountId: faker.string.uuid(),
        date: "2000-01-02",
        type: TransactionType.EXPENSE,
      },
    };

    // Persists and returns created transaction for first allowed call
    mockTransactionService.createTransaction.mockResolvedValue(
      createdTransaction,
    );

    // Model requests two create_transaction calls in one turn
    mockModel.respondWithTools([toolCall, toolCall]);

    // Model emits final text after blocked call is reported back
    mockModel.respond(new AIMessage("Done"));

    // Act
    const result = await agent.invoke({ messages }, { context: baseContext });

    // Assert
    const toolMessages = result.messages.filter(
      (message) =>
        message instanceof ToolMessage &&
        message.name === CREATE_TRANSACTION_TOOL_NAME,
    );

    expect(toolMessages).toHaveLength(2);
    expect(toolMessages.map((message) => message.content)).toEqual(
      expect.arrayContaining([
        expect.stringContaining(createdTransaction.id), // First call succeeds and returns transaction ID
        `Tool call limit exceeded. Do not call '${CREATE_TRANSACTION_TOOL_NAME}' again.`,
      ]),
    );

    expect(mockTransactionService.createTransaction).toHaveBeenCalledTimes(1);
  });
});
