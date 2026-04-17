import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createAgent, dynamicSystemPromptMiddleware } from "langchain";
import { AccountService } from "../../services/account-service";
import { CategoryService } from "../../services/category-service";
import { TransactionService } from "../../services/transaction-service";
import { createMockAccountRepository } from "../../utils/test-utils/repositories/account-repository-mocks";
import { createMockCategoryRepository } from "../../utils/test-utils/repositories/category-repository-mocks";
import { createMockTransactionRepository } from "../../utils/test-utils/repositories/transaction-repository-mocks";
import { createCreateAccountTool } from "../tools/create-account";
import { createCreateCategoryTool } from "../tools/create-category";
import { createCreateTransactionSubagentTool } from "../tools/create-transaction-subagent";
import { createUpdateAccountTool } from "../tools/update-account";
import { createUpdateCategoryTool } from "../tools/update-category";
import { createAssistantAgent } from "./assistant-agent";

jest.mock("langchain", () => {
  const actual = jest.requireActual<typeof import("langchain")>("langchain");

  return {
    ...actual,
    createAgent: jest.fn(),
    dynamicSystemPromptMiddleware: jest.fn(),
  };
});

jest.mock("../tools/create-transaction-subagent", () => ({
  createCreateTransactionSubagentTool: jest.fn(),
}));

jest.mock("../tools/create-account", () => ({
  createCreateAccountTool: jest.fn(),
}));

jest.mock("../tools/create-category", () => ({
  createCreateCategoryTool: jest.fn(),
}));

jest.mock("../tools/update-account", () => ({
  createUpdateAccountTool: jest.fn(),
}));

jest.mock("../tools/update-category", () => ({
  createUpdateCategoryTool: jest.fn(),
}));

const mockDynamicSystemPromptMiddleware = jest.mocked(
  dynamicSystemPromptMiddleware,
);

describe("createAssistantAgent", () => {
  let mockModel: BaseChatModel;

  beforeEach(() => {
    jest.clearAllMocks();
    mockModel = {} as BaseChatModel;
    (createAgent as jest.Mock).mockReturnValue({ invoke: jest.fn() });
    (createCreateTransactionSubagentTool as jest.Mock).mockReturnValue({
      name: "create_transaction_subagent",
    });
    (createCreateAccountTool as jest.Mock).mockReturnValue({
      name: "create_account",
    });
    (createCreateCategoryTool as jest.Mock).mockReturnValue({
      name: "create_category",
    });
    (createUpdateAccountTool as jest.Mock).mockReturnValue({
      name: "update_account",
    });
    (createUpdateCategoryTool as jest.Mock).mockReturnValue({
      name: "update_category",
    });
  });

  it("should call createAgent", () => {
    // Arrange
    const accountService = {} as AccountService;
    const categoryService = {} as CategoryService;

    // Act
    createAssistantAgent({
      model: mockModel,
      accountRepository: createMockAccountRepository(),
      accountService,
      categoryRepository: createMockCategoryRepository(),
      categoryService,
      transactionRepository: createMockTransactionRepository(),
      transactionService: {} as TransactionService,
    });

    // Assert
    const assistantCallArg = (createAgent as jest.Mock).mock.calls[0][0] as {
      model: BaseChatModel;
      tools: { name: string }[];
      middleware: unknown[];
    };
    const { model, tools, middleware } = assistantCallArg;

    expect(model).toBe(mockModel);

    const toolNames = tools.map((tool) => tool.name);
    expect(toolNames).toHaveLength(12);
    expect(toolNames).toEqual(
      expect.arrayContaining([
        "aggregate_transactions",
        "avg",
        "calculate",
        "create_account",
        "create_category",
        "create_transaction_subagent",
        "get_accounts",
        "get_categories",
        "get_transactions",
        "sum",
        "update_account",
        "update_category",
      ]),
    );

    expect(middleware).toHaveLength(1);

    const buildSystemPrompt =
      mockDynamicSystemPromptMiddleware.mock.calls[0][0];
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
    const fakeAgent = { invoke: jest.fn() };
    (createAgent as jest.Mock).mockReturnValue(fakeAgent);

    // Act
    const result = createAssistantAgent({
      model: mockModel,
      accountRepository: createMockAccountRepository(),
      accountService: {} as AccountService,
      categoryRepository: createMockCategoryRepository(),
      categoryService: {} as CategoryService,
      transactionRepository: createMockTransactionRepository(),
      transactionService: {} as TransactionService,
    });

    // Assert
    expect(result).toBe(fakeAgent);
  });
});
