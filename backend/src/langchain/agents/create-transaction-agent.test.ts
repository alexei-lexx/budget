import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import {
  createAgent,
  dynamicSystemPromptMiddleware,
  toolCallLimitMiddleware,
} from "langchain";
import { CREATE_TRANSACTION_TOOL_NAME } from "../../langchain/tools/create-transaction";
import { TransactionService } from "../../services/transaction-service";
import { createMockAccountRepository } from "../../utils/test-utils/repositories/account-repository-mocks";
import { createMockCategoryRepository } from "../../utils/test-utils/repositories/category-repository-mocks";
import { createMockTransactionRepository } from "../../utils/test-utils/repositories/transaction-repository-mocks";
import { createCreateTransactionAgent } from "./create-transaction-agent";

jest.mock("langchain", () => {
  const actual = jest.requireActual<typeof import("langchain")>("langchain");

  return {
    ...actual,
    createAgent: jest.fn(),
    dynamicSystemPromptMiddleware: jest.fn(),
    toolCallLimitMiddleware: jest.fn(),
  };
});

describe("createCreateTransactionAgent", () => {
  let mockModel: BaseChatModel;

  beforeEach(() => {
    jest.clearAllMocks();

    mockModel = {} as BaseChatModel;
    (createAgent as jest.Mock).mockReturnValue({ invoke: jest.fn() });
  });

  it("should call createAgent", () => {
    // Act
    createCreateTransactionAgent({
      model: mockModel,
      accountRepository: createMockAccountRepository(),
      categoryRepository: createMockCategoryRepository(),
      transactionRepository: createMockTransactionRepository(),
      transactionService: {} as unknown as TransactionService,
    });

    // Assert
    const callArg = (createAgent as jest.Mock).mock.calls[0][0] as {
      model: BaseChatModel;
      tools: { name: string }[];
      middleware: unknown[];
    };
    const { model, tools, middleware } = callArg;

    expect(model).toBe(mockModel);

    const toolNames = tools.map((tool) => tool.name);
    expect(toolNames).toHaveLength(4);
    expect(toolNames).toEqual(
      expect.arrayContaining([
        CREATE_TRANSACTION_TOOL_NAME,
        "get_accounts",
        "get_categories",
        "get_transactions",
      ]),
    );

    expect(middleware).toHaveLength(2);
    expect(toolCallLimitMiddleware).toHaveBeenCalledWith({
      toolName: CREATE_TRANSACTION_TOOL_NAME,
      runLimit: 1,
    });

    const buildSystemPrompt = (
      dynamicSystemPromptMiddleware as jest.Mock<
        typeof dynamicSystemPromptMiddleware
      >
    ).mock.calls[0][0];
    const systemPrompt = buildSystemPrompt(
      { messages: [] },
      { context: { today: "2000-01-02", isVoiceInput: false } },
    );
    expect(systemPrompt).toContain(
      "You are an agent that creates payment transactions",
    );
    expect(systemPrompt).toContain("2000-01-02");
  });

  it("should return the agent created by createAgent", () => {
    // Arrange
    const fakeAgent = { invoke: jest.fn() };
    (createAgent as jest.Mock).mockReturnValue(fakeAgent);

    // Act
    const result = createCreateTransactionAgent({
      model: mockModel,
      accountRepository: createMockAccountRepository(),
      categoryRepository: createMockCategoryRepository(),
      transactionRepository: createMockTransactionRepository(),
      transactionService: {} as unknown as TransactionService,
    });

    // Assert
    expect(result).toBe(fakeAgent);
  });
});
