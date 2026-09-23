import { faker } from "@faker-js/faker";
import { AIMessage, ToolMessage, fakeModel } from "langchain";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BusinessError } from "../../services/business-error";
import { createMockTransactionRepository } from "../../utils/test-utils/repositories/transaction-repository-mocks";
import { createMockAccountService } from "../../utils/test-utils/services/account-service-mocks";
import { createMockCategoryService } from "../../utils/test-utils/services/category-service-mocks";
import { createMockTransactionService } from "../../utils/test-utils/services/transaction-service-mocks";
import { createAssistantAgent } from "./assistant-agent";

describe("createAssistantAgent", () => {
  let agent: ReturnType<typeof createAssistantAgent>;
  let mockModel: ReturnType<typeof fakeModel>;
  let mockAccountService: ReturnType<typeof createMockAccountService>;

  const baseContext = {
    today: "2000-01-02",
    userId: faker.string.uuid(),
  };

  const messages = [{ role: "user", content: "list my accounts" }];

  beforeEach(() => {
    vi.clearAllMocks();

    mockModel = fakeModel();
    mockAccountService = createMockAccountService();

    agent = createAssistantAgent({
      model: mockModel,
      accountService: mockAccountService,
      categoryService: createMockCategoryService(),
      transactionRepository: createMockTransactionRepository(),
      transactionService: createMockTransactionService(),
    });
  });

  // Happy path

  it("responds to user message", async () => {
    // Arrange

    // Model emits final text without tool calls
    mockModel.respond(new AIMessage("Hello!"));

    // Act
    const result = await agent.invoke({ messages }, { context: baseContext });

    // Assert
    const lastMessage = result.messages.at(-1);
    expect(lastMessage?.content).toBe("Hello!");
  });

  it("includes role in system prompt", async () => {
    // Arrange

    // Model emits final text without tool calls
    mockModel.respond(new AIMessage("OK"));

    // Act
    await agent.invoke({ messages }, { context: baseContext });

    // Assert
    expect(mockModel.calls[0]?.messages[0]?.content).toContain(
      "You are a personal finance assistant",
    );
  });

  it("includes today's date in system prompt", async () => {
    // Arrange

    // Model emits final text without tool calls
    mockModel.respond(new AIMessage("OK"));

    // Act
    await agent.invoke({ messages }, { context: baseContext });

    // Assert
    expect(mockModel.calls[0]?.messages[0]?.content).toContain(
      "Today is 2000-01-02.",
    );
  });

  it("invokes bound tool when model requests it", async () => {
    // Arrange

    // Returns empty account list for get_accounts tool
    mockAccountService.getAccountsByUser.mockResolvedValue([]);

    // Model calls get_accounts tool
    mockModel.respondWithTools([
      {
        name: "get_accounts",
        args: { scope: "ACTIVE" },
      },
    ]);

    // Model emits final text after tool result
    mockModel.respond(new AIMessage("You have no accounts."));

    // Act
    const result = await agent.invoke({ messages }, { context: baseContext });

    // Assert
    const lastMessage = result.messages.at(-1);
    expect(lastMessage?.content).toBe("You have no accounts.");

    const toolMessages = result.messages.filter(
      (message) =>
        message instanceof ToolMessage && message.name === "get_accounts",
    );
    expect(toolMessages).toHaveLength(1);
    expect(mockAccountService.getAccountsByUser).toHaveBeenCalledTimes(1);
  });

  // Dependency failures

  it("exposes original error when tool fails with business error", async () => {
    // Arrange
    // Fails due to business rule violation
    mockAccountService.getAccountsByUser.mockRejectedValue(
      new BusinessError("Accounts are temporarily unavailable"),
    );

    // Model calls get_accounts tool, then emits final text after tool result
    mockModel
      .respondWithTools([
        {
          name: "get_accounts",
          args: { scope: "ACTIVE" },
        },
      ])
      .respond(new AIMessage("Something went wrong."));

    // Act
    const result = await agent.invoke({ messages }, { context: baseContext });

    // Assert
    const toolMessage = result.messages.find(
      (message) =>
        message instanceof ToolMessage && message.name === "get_accounts",
    );
    expect(toolMessage?.content).toBe("Accounts are temporarily unavailable");
    expect(mockAccountService.getAccountsByUser).toHaveBeenCalledTimes(1);
  });

  it("hides internal error details when tool fails unexpectedly", async () => {
    // Arrange
    // Fails due to unexpected infrastructure error
    mockAccountService.getAccountsByUser.mockRejectedValue(
      new Error("Database timeout"),
    );

    // Model calls get_accounts tool,
    // then emits final text after tool result
    mockModel
      .respondWithTools([
        {
          name: "get_accounts",
          args: { scope: "ACTIVE" },
        },
      ])
      .respond(new AIMessage("Something went wrong."));

    // Act
    const result = await agent.invoke({ messages }, { context: baseContext });

    // Assert
    const toolMessage = result.messages.find(
      (message) =>
        message instanceof ToolMessage && message.name === "get_accounts",
    );
    expect(toolMessage?.content).toBe(
      "Tool 'get_accounts' failed unexpectedly.",
    );
    expect(mockAccountService.getAccountsByUser).toHaveBeenCalledTimes(1);
  });
});
