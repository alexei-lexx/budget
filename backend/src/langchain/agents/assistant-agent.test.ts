import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AIMessage, ToolMessage, fakeModel } from "langchain";
import { TransactionService } from "../../services/transaction-service";
import { createMockAccountRepository } from "../../utils/test-utils/repositories/account-repository-mocks";
import { createMockCategoryRepository } from "../../utils/test-utils/repositories/category-repository-mocks";
import { createMockTransactionRepository } from "../../utils/test-utils/repositories/transaction-repository-mocks";
import { createMockAccountService } from "../../utils/test-utils/services/account-service-mocks";
import { createMockCategoryService } from "../../utils/test-utils/services/category-service-mocks";
import { createAssistantAgent } from "./assistant-agent";

describe("createAssistantAgent", () => {
  let agent: ReturnType<typeof createAssistantAgent>;
  let mockModel: ReturnType<typeof fakeModel>;
  let mockAccountRepository: ReturnType<typeof createMockAccountRepository>;

  const baseContext = {
    today: "2000-01-02",
    userId: faker.string.uuid(),
  };

  const messages = [{ role: "user", content: "list my accounts" }];

  beforeEach(() => {
    jest.clearAllMocks();

    mockModel = fakeModel();
    mockAccountRepository = createMockAccountRepository();

    agent = createAssistantAgent({
      model: mockModel,
      accountRepository: mockAccountRepository,
      accountService: createMockAccountService(),
      categoryRepository: createMockCategoryRepository(),
      categoryService: createMockCategoryService(),
      transactionRepository: createMockTransactionRepository(),
      transactionService: {} as TransactionService,
    });
  });

  // Happy path

  it("should respond to user message", async () => {
    // Arrange

    // Model emits final text without tool calls
    mockModel.respond(new AIMessage("Hello!"));

    // Act
    const result = await agent.invoke({ messages }, { context: baseContext });

    // Assert
    const lastMessage = result.messages[result.messages.length - 1];
    expect(lastMessage.content).toBe("Hello!");
  });

  it("should include role in system prompt", async () => {
    // Arrange

    // Model emits final text without tool calls
    mockModel.respond(new AIMessage("OK"));

    // Act
    await agent.invoke({ messages }, { context: baseContext });

    // Assert
    expect(mockModel.calls[0].messages[0].content).toContain(
      "You are a personal finance assistant",
    );
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

  it("should invoke bound tool when model requests it", async () => {
    // Arrange

    // Returns empty account list for get_accounts tool
    mockAccountRepository.findManyWithArchivedByUserId.mockResolvedValue([]);

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
    const lastMessage = result.messages[result.messages.length - 1];
    expect(lastMessage.content).toBe("You have no accounts.");

    const toolMessages = result.messages.filter(
      (message) =>
        message instanceof ToolMessage && message.name === "get_accounts",
    );
    expect(toolMessages).toHaveLength(1);
    expect(
      mockAccountRepository.findManyWithArchivedByUserId,
    ).toHaveBeenCalledTimes(1);
  });
});
