import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createAgent, dynamicSystemPromptMiddleware } from "langchain";
import { createMockAccountRepository } from "../../utils/test-utils/repositories/account-repository-mocks";
import { createMockCategoryRepository } from "../../utils/test-utils/repositories/category-repository-mocks";
import { createMockTransactionRepository } from "../../utils/test-utils/repositories/transaction-repository-mocks";
import { createAssistantAgent } from "./assistant-agent";

jest.mock("langchain", () => {
  const actual = jest.requireActual<typeof import("langchain")>("langchain");

  return {
    ...actual,
    createAgent: jest.fn(),
    dynamicSystemPromptMiddleware: jest.fn(),
  };
});

describe("createAssistantAgent", () => {
  let mockModel: BaseChatModel;

  beforeEach(() => {
    jest.clearAllMocks();

    mockModel = {} as BaseChatModel;

    // Returns a minimal agent object
    (createAgent as jest.Mock).mockReturnValue({ invoke: jest.fn() });
  });

  // Happy path

  it("should call createAgent with correct tools", () => {
    // Act
    createAssistantAgent({
      model: mockModel,
      accountRepository: createMockAccountRepository(),
      categoryRepository: createMockCategoryRepository(),
      transactionRepository: createMockTransactionRepository(),
    });

    // Assert
    const callArg = (createAgent as jest.Mock).mock.calls[0][0] as {
      model: BaseChatModel;
      tools: { name: string }[];
      middleware: unknown[];
    };
    const { model, tools, middleware } = callArg;

    expect(model).toBe(mockModel);

    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toHaveLength(8);
    expect(toolNames).toEqual(
      expect.arrayContaining([
        "aggregateTransactions",
        "avg",
        "calculate",
        "getAccounts",
        "getCategories",
        "getTransactions",
        "loadSkill",
        "sum",
      ]),
    );

    expect(middleware).toHaveLength(1);
  });

  it("should inject today date into system prompt", () => {
    // Act
    createAssistantAgent({
      model: mockModel,
      accountRepository: createMockAccountRepository(),
      categoryRepository: createMockCategoryRepository(),
      transactionRepository: createMockTransactionRepository(),
    });

    // Assert
    const buildSystemPrompt = (
      dynamicSystemPromptMiddleware as jest.Mock<
        typeof dynamicSystemPromptMiddleware
      >
    ).mock.calls[0][0];

    const systemPrompt = buildSystemPrompt(
      { messages: [] },
      {
        context: {
          today: "2000-01-02",
          userId: faker.string.uuid(),
        },
      },
    );

    expect(systemPrompt).toContain("You are a personal finance assistant");
    expect(systemPrompt).toContain("Today is 2000-01-02");
  });

  it("should return the agent created by createAgent", () => {
    // Arrange
    // Returns a specific agent instance to verify identity
    const fakeAgent = { invoke: jest.fn() };
    (createAgent as jest.Mock).mockReturnValue(fakeAgent);

    // Act
    const result = createAssistantAgent({
      model: mockModel,
      accountRepository: createMockAccountRepository(),
      categoryRepository: createMockCategoryRepository(),
      transactionRepository: createMockTransactionRepository(),
    });

    // Assert
    expect(result).toBe(fakeAgent);
  });
});
