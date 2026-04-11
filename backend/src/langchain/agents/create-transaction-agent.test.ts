import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createAgent } from "langchain";
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
  };
});

describe("createCreateTransactionAgent", () => {
  let mockModel: BaseChatModel;

  beforeEach(() => {
    mockModel = {} as BaseChatModel;
    (createAgent as jest.Mock).mockReturnValue({ invoke: jest.fn() });
    jest.clearAllMocks();
  });

  it("should call createAgent with model, tools, and system prompt", () => {
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
      systemPrompt: string;
    };
    const { model, tools, systemPrompt } = callArg;

    expect(model).toBe(mockModel);

    const toolNames = tools.map((tool) => tool.name);
    expect(toolNames).toHaveLength(4);
    expect(toolNames).toEqual(
      expect.arrayContaining([
        CREATE_TRANSACTION_TOOL_NAME,
        "getAccounts",
        "getCategories",
        "getTransactions",
      ]),
    );

    expect(systemPrompt).toContain(
      "You are an agent that creates payment transactions",
    );
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
