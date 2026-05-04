import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AIMessage, HumanMessage, fakeModel } from "langchain";
import { createMockAccountRepository } from "../../utils/test-utils/repositories/account-repository-mocks";
import { createMockCategoryRepository } from "../../utils/test-utils/repositories/category-repository-mocks";
import { createMockTransactionRepository } from "../../utils/test-utils/repositories/transaction-repository-mocks";
import { createMockTransactionService } from "../../utils/test-utils/services/transaction-service-mocks";
import { VOICE_INPUT_INDICATOR } from "../agents/create-transaction-agent";
import { createCreateTransactionSubagentTool } from "./create-transaction-subagent";

describe("createCreateTransactionSubagentTool", () => {
  let mockModel: ReturnType<typeof fakeModel>;
  let transactionTool: ReturnType<typeof createCreateTransactionSubagentTool>;

  const baseContext = {
    today: "2026-04-15",
    userId: faker.string.uuid(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockModel = fakeModel();

    transactionTool = createCreateTransactionSubagentTool({
      model: mockModel,
      accountRepository: createMockAccountRepository(),
      categoryRepository: createMockCategoryRepository(),
      transactionRepository: createMockTransactionRepository(),
      transactionService: createMockTransactionService(),
    });
  });

  // Happy path

  it("returns tool with correct name", () => {
    expect(transactionTool.name).toBe("create_transaction_subagent");
  });

  it("forwards user text to model", async () => {
    // Arrange

    // Model emits final text without tool calls
    mockModel.respond(new AIMessage("Transaction created."));

    // Act
    await transactionTool.invoke(
      { text: "create transaction" },
      { context: baseContext },
    );

    // Assert
    const userMessage = mockModel.calls[0].messages.find(
      (message) => message instanceof HumanMessage,
    );
    expect(userMessage?.content).toBe("create transaction");
  });

  it("propagates agent context to model", async () => {
    // Arrange
    const context = {
      ...baseContext,
      isVoiceInput: true,
    };

    // Model emits final text without tool calls
    mockModel.respond(new AIMessage("Transaction created."));

    // Act
    await transactionTool.invoke({ text: "create transaction" }, { context });

    // Assert
    const systemPrompt = mockModel.calls[0].messages[0].content;
    expect(systemPrompt).toContain("Today is 2026-04-15");
    expect(systemPrompt).toContain(VOICE_INPUT_INDICATOR);
  });

  it("returns model last message text as tool output", async () => {
    // Arrange

    // Model emits final text without tool calls
    mockModel.respond(new AIMessage("Transaction created successfully"));

    // Act
    const result = await transactionTool.invoke(
      { text: "create transaction" },
      { context: baseContext },
    );

    // Assert
    expect(result).toBe("Transaction created successfully");
  });

  it("trims whitespace from model answer", async () => {
    // Arrange

    // Model emits whitespace-padded text
    mockModel.respond(new AIMessage("  Transaction created.  "));

    // Act
    const result = await transactionTool.invoke(
      { text: "create transaction" },
      { context: baseContext },
    );

    // Assert
    expect(result).toBe("Transaction created.");
  });

  it("returns safe fallback when model yields no text", async () => {
    // Arrange

    // Model emits message with no text blocks
    mockModel.respond(new AIMessage({ content: [] }));

    // Act
    const result = await transactionTool.invoke(
      { text: "create transaction" },
      { context: baseContext },
    );

    // Assert
    expect(result).toContain("I was unable to process that transaction.");
  });

  // Dependency failures

  it("propagates error from model", async () => {
    // Arrange

    // Model always throws
    mockModel.alwaysThrow(new Error("Agent failed"));

    // Act & Assert
    await expect(
      transactionTool.invoke(
        { text: "create transaction" },
        { context: baseContext },
      ),
    ).rejects.toThrow("Agent failed");
  });
});
