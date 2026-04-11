import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createAgent } from "langchain";
import { createMockAccountRepository } from "../../utils/test-utils/repositories/account-repository-mocks";
import { createMockCategoryRepository } from "../../utils/test-utils/repositories/category-repository-mocks";
import { createMockTransactionRepository } from "../../utils/test-utils/repositories/transaction-repository-mocks";
import { createInsightAgent } from "./insight-agent";

jest.mock("langchain", () => {
  const actual = jest.requireActual<typeof import("langchain")>("langchain");

  return {
    ...actual,
    createAgent: jest.fn(),
  };
});

describe("createInsightAgent", () => {
  let mockModel: BaseChatModel;

  beforeEach(() => {
    mockModel = {} as BaseChatModel;
    (createAgent as jest.Mock).mockReturnValue({ invoke: jest.fn() });
    jest.clearAllMocks();
  });

  it("should call createAgent with model, tools, and system prompt", () => {
    // Act
    createInsightAgent({
      model: mockModel,
      accountRepository: createMockAccountRepository(),
      categoryRepository: createMockCategoryRepository(),
      transactionRepository: createMockTransactionRepository(),
    });

    // Assert
    const callArg = (createAgent as jest.Mock).mock.calls[0][0] as {
      model: BaseChatModel;
      tools: { name: string }[];
      systemPrompt: string;
    };
    const { model, tools, systemPrompt } = callArg;

    expect(model).toBe(mockModel);

    const toolNames = tools.map((tool) => tool.name);
    expect(toolNames).toHaveLength(7);
    expect(toolNames).toEqual(
      expect.arrayContaining([
        "aggregateTransactions",
        "avg",
        "calculate",
        "getAccounts",
        "getCategories",
        "getTransactions",
        "sum",
      ]),
    );

    expect(systemPrompt).toContain("You are a personal finance assistant");
  });

  it("should return the agent created by createAgent", () => {
    // Arrange
    const fakeAgent = { invoke: jest.fn() };
    (createAgent as jest.Mock).mockReturnValue(fakeAgent);

    // Act
    const result = createInsightAgent({
      model: mockModel,
      accountRepository: createMockAccountRepository(),
      categoryRepository: createMockCategoryRepository(),
      transactionRepository: createMockTransactionRepository(),
    });

    // Assert
    expect(result).toBe(fakeAgent);
  });
});
