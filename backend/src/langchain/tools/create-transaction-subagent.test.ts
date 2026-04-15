import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage } from "langchain";
import { TransactionService } from "../../services/transaction-service";
import { createMockAccountRepository } from "../../utils/test-utils/repositories/account-repository-mocks";
import { createMockCategoryRepository } from "../../utils/test-utils/repositories/category-repository-mocks";
import { createMockTransactionRepository } from "../../utils/test-utils/repositories/transaction-repository-mocks";
import { createCreateTransactionAgent } from "../agents/create-transaction-agent";
import { createCreateTransactionSubagentTool } from "./create-transaction-subagent";

jest.mock("../agents/create-transaction-agent", () => ({
  createCreateTransactionAgent: jest.fn(),
}));

type AgentInvokeFn = (
  input: unknown,
  config?: unknown,
) => Promise<{ messages: AIMessage[] }>;

const buildTool = () =>
  createCreateTransactionSubagentTool({
    model: {} as BaseChatModel,
    accountRepository: createMockAccountRepository(),
    categoryRepository: createMockCategoryRepository(),
    transactionRepository: createMockTransactionRepository(),
    transactionService: {} as TransactionService,
  });

describe("createCreateTransactionSubagentTool", () => {
  let mockAgent: { invoke: jest.Mock<AgentInvokeFn> };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAgent = { invoke: jest.fn<AgentInvokeFn>() };
    (createCreateTransactionAgent as jest.Mock).mockReturnValue(mockAgent);
  });

  // Happy path

  it("should return tool with correct name", () => {
    const transactionTool = buildTool();

    expect(transactionTool.name).toBe("create_transaction_subagent");
  });

  it("should forward the user text to subagent invocation", async () => {
    // Arrange
    mockAgent.invoke.mockResolvedValue({
      messages: [new AIMessage({ content: "Transaction created." })],
    });
    const transactionTool = buildTool();

    // Act
    await transactionTool.invoke({ text: "coffee 5€" });

    // Assert
    const [input] = mockAgent.invoke.mock.calls[0] as [
      { messages: { role: string; content: string }[] },
      unknown,
    ];
    expect(input.messages[0]).toEqual({ role: "user", content: "coffee 5€" });
  });

  it("should propagate agent context to subagent invocation", async () => {
    // Arrange
    mockAgent.invoke.mockResolvedValue({
      messages: [new AIMessage({ content: "Transaction created." })],
    });
    const transactionTool = buildTool();
    const config = {
      context: {
        isVoiceInput: true,
        today: "2026-04-15",
        userId: "user-123",
      },
    };

    // Act
    await transactionTool.invoke({ text: "coffee 5€" }, config);

    // Assert
    const [, passedConfig] = mockAgent.invoke.mock.calls[0] as [
      unknown,
      { context: unknown },
    ];
    expect(passedConfig).toEqual(
      expect.objectContaining({ context: config.context }),
    );
  });

  it("should return the subagent last message text as tool output", async () => {
    // Arrange
    mockAgent.invoke.mockResolvedValue({
      messages: [
        new AIMessage({ content: "Transaction created successfully" }),
      ],
    });
    const transactionTool = buildTool();

    // Act
    const result = await transactionTool.invoke({ text: "coffee 5€" });

    // Assert
    expect(result).toBe("Transaction created successfully");
  });

  it("should trim whitespace from the subagent answer", async () => {
    // Arrange
    mockAgent.invoke.mockResolvedValue({
      messages: [new AIMessage({ content: "  Transaction created.  " })],
    });
    const transactionTool = buildTool();

    // Act
    const result = await transactionTool.invoke({ text: "coffee 5€" });

    // Assert
    expect(result).toBe("Transaction created.");
  });

  it("should return a safe fallback when the subagent yields no text", async () => {
    // Arrange
    mockAgent.invoke.mockResolvedValue({ messages: [] });
    const transactionTool = buildTool();

    // Act
    const result = await transactionTool.invoke({ text: "coffee 5€" });

    // Assert
    expect(result).toContain("I was unable to process that transaction.");
  });

  // Dependency failures

  it("should propagate error from subagent", async () => {
    // Arrange
    mockAgent.invoke.mockRejectedValue(new Error("Agent failed"));
    const transactionTool = buildTool();

    // Act & Assert
    await expect(transactionTool.invoke({ text: "coffee 5€" })).rejects.toThrow(
      "Agent failed",
    );
  });
});
