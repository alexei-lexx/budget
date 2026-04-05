import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fakeTransaction } from "../../utils/test-utils/models/transaction-fakes";
import { createMockAccountRepository } from "../../utils/test-utils/repositories/account-repository-mocks";
import { createMockCategoryRepository } from "../../utils/test-utils/repositories/category-repository-mocks";
import { createMockTransactionRepository } from "../../utils/test-utils/repositories/transaction-repository-mocks";
import {
  type Agent,
  type AgentTraceMessage,
  AgentTraceMessageType,
  ToolSignature,
} from "../ports/agent";
import { TransactionService } from "../transaction-service";
import { CreateTransactionFromTextService } from "./create-transaction-from-text-service";

const createMockAgent = (): jest.Mocked<Agent> => ({
  call: jest.fn(),
});

const createMockTransactionService = (): jest.Mocked<
  Pick<TransactionService, "createTransaction" | "getTransactionById">
> => ({
  createTransaction: jest.fn(),
  getTransactionById: jest.fn(),
});

describe("CreateTransactionFromTextService", () => {
  const userId = faker.string.uuid();
  const text = "coffee at starbucks for 5 euros";
  let service: CreateTransactionFromTextService;
  let mockAgent: jest.Mocked<Agent>;
  let mockTransactionService: jest.Mocked<
    Pick<TransactionService, "createTransaction" | "getTransactionById">
  >;

  beforeEach(() => {
    mockAgent = createMockAgent();
    mockTransactionService = createMockTransactionService();

    service = new CreateTransactionFromTextService({
      accountRepository: createMockAccountRepository(),
      categoryRepository: createMockCategoryRepository(),
      transactionRepository: createMockTransactionRepository(),
      agent: mockAgent,
      transactionService:
        mockTransactionService as unknown as TransactionService,
    });

    jest.clearAllMocks();
  });

  describe("validation", () => {
    it("should return failure when userId is empty", async () => {
      // Act
      const result = await service.call({ userId: "", text: "some text" });

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: { message: "User ID is required" },
      });
      expect(mockAgent.call).not.toHaveBeenCalled();
    });

    it("should return failure when text is empty", async () => {
      // Act
      const result = await service.call({ userId, text: "" });

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: { message: "Text is required" },
      });
      expect(mockAgent.call).not.toHaveBeenCalled();
    });

    it("should return failure when text is only whitespace", async () => {
      // Act
      const result = await service.call({ userId, text: "   " });

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: { message: "Text is required" },
      });
      expect(mockAgent.call).not.toHaveBeenCalled();
    });
  });

  describe("happy path", () => {
    const transactionId = faker.string.uuid();
    const createdTransaction = fakeTransaction();

    beforeEach(() => {
      // Arrange
      mockAgent.call.mockResolvedValue({
        answer: "Transaction created successfully",
        toolExecutions: [
          {
            tool: "yetAnotherToolOne",
            input: "{}",
            output: "{}",
          },
          {
            tool: "createTransaction",
            input: '{ "amount": 5 }',
            output: JSON.stringify({
              success: true,
              data: { id: transactionId },
            }),
          },
          {
            tool: "yetAnotherToolTwo",
            input: "{}",
            output: "{}",
          },
        ],
        agentTrace: [
          {
            type: AgentTraceMessageType.TEXT,
            content: "Thinking...",
          },
        ],
      });

      mockTransactionService.getTransactionById.mockResolvedValue(
        createdTransaction,
      );
    });

    it("should return the created transaction", async () => {
      // Act
      const result = await service.call({ userId, text });

      // Assert
      expect(result).toMatchObject({
        success: true,
        data: { transaction: createdTransaction },
      });
      expect(mockTransactionService.getTransactionById).toHaveBeenCalledWith(
        transactionId,
        userId,
      );
    });

    it("should return agentTrace from agent response", async () => {
      // Act
      const result = await service.call({ userId, text });

      // Assert
      expect(result).toMatchObject({
        success: true,
        data: {
          agentTrace: [
            {
              type: AgentTraceMessageType.TEXT,
              content: "Thinking...",
            },
          ],
        },
      });
    });

    it("should pass trimmed text to agent", async () => {
      // Act
      await service.call({ userId, text: `    ${text}    ` });

      // Assert
      const callArgs = mockAgent.call.mock.calls[0][0];
      expect(callArgs.messages[0].content).toBe(text);
    });

    it("should include all required tools in agent call", async () => {
      // Act
      await service.call({ userId, text });

      // Assert
      const callArgs = mockAgent.call.mock.calls[0][0];
      const toolNames =
        callArgs.tools?.map((t: ToolSignature<unknown, unknown>) => t.name) ??
        [];
      expect(toolNames).toContain("createTransaction");
      expect(toolNames).toContain("getAccounts");
      expect(toolNames).toContain("getCategories");
      expect(toolNames).toContain("getTransactions");
    });

    it("should include today's date in system prompt", async () => {
      // Act
      await service.call({ userId, text });

      // Assert
      const callArgs = mockAgent.call.mock.calls[0][0];
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      expect(callArgs.systemPrompt).toContain(`Today is ${today}`);
    });

    it("should not include voice amount hint in system prompt when isVoiceInput is false", async () => {
      // Act
      await service.call({ userId, text, isVoiceInput: false });

      // Assert
      const callArgs = mockAgent.call.mock.calls[0][0];
      expect(callArgs.systemPrompt).not.toContain("voice recognition");
    });

    it("should include voice amount hint in system prompt when isVoiceInput is true", async () => {
      // Act
      await service.call({ userId, text, isVoiceInput: true });

      // Assert
      const callArgs = mockAgent.call.mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain("voice recognition");
    });
  });

  describe("error paths", () => {
    it("should propagate error when agent call fails", async () => {
      // Arrange
      mockAgent.call.mockRejectedValue(new Error("Agent unavailable"));

      // Act & Assert
      await expect(service.call({ userId, text })).rejects.toThrow(
        "Agent unavailable",
      );
      expect(mockTransactionService.getTransactionById).not.toHaveBeenCalled();
    });

    it("should return failure when agent does not attempt to create transaction", async () => {
      // Arrange
      mockAgent.call.mockResolvedValue({
        answer: "I need more information.",
        toolExecutions: [
          {
            tool: "anotherTool",
            input: "{}",
            output: "{}",
          },
        ],
        agentTrace: [],
      });

      // Act
      const result = await service.call({ userId, text });

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: {
          message:
            "Agent did not attempt to create a transaction\nI need more information.",
        },
      });
      expect(mockTransactionService.getTransactionById).not.toHaveBeenCalled();
    });

    it("should return failure when tool output is not valid JSON", async () => {
      // Arrange
      mockAgent.call.mockResolvedValue({
        answer: "Creating transaction...",
        toolExecutions: [
          {
            tool: "createTransaction",
            input: '{ "amount": 5 }',
            output: "This is not valid JSON",
          },
        ],
        agentTrace: [],
      });

      // Act
      const result = await service.call({ userId, text });

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: { message: "Response from agent is not valid JSON" },
      });
      expect(mockTransactionService.getTransactionById).not.toHaveBeenCalled();
    });

    it("should return failure when tool output does not match expected schema", async () => {
      // Arrange
      mockAgent.call.mockResolvedValue({
        answer: "Creating transaction...",
        toolExecutions: [
          {
            tool: "createTransaction",
            input: '{ "amount": 5 }',
            output: JSON.stringify({
              success: true,
              data: {
                currency: "EUR", // missing "id"
              },
            }),
          },
        ],
        agentTrace: [],
      });

      // Act
      const result = await service.call({ userId, text });

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: {
          message: "Response from agent does not match expected format",
        },
      });
      expect(mockTransactionService.getTransactionById).not.toHaveBeenCalled();
    });

    it("should return agentTrace from agent response", async () => {
      // Arrange
      const agentTrace: AgentTraceMessage[] = [
        { type: AgentTraceMessageType.TEXT, content: "Thinking..." },
      ];
      mockAgent.call.mockResolvedValue({
        answer: "I need more information.",
        toolExecutions: [],
        agentTrace,
      });

      // Act
      const result = await service.call({ userId, text });

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: { agentTrace },
      });
    });

    it("should handle multiple creation tool executions", async () => {
      // Arrange
      const transactionId = faker.string.uuid();
      const createdTransaction = fakeTransaction();

      mockAgent.call.mockResolvedValue({
        answer: "Two transactions created successfully",
        toolExecutions: [
          {
            tool: "createTransaction",
            input: '{ "amount": 4 }',
            output: JSON.stringify({
              success: true,
              data: { id: faker.string.uuid() },
            }),
          },
          {
            tool: "createTransaction",
            input: '{ "amount": 5 }',
            output: JSON.stringify({
              success: true,
              data: { id: transactionId },
            }),
          },
        ],
        agentTrace: [],
      });
      mockTransactionService.getTransactionById.mockResolvedValue(
        createdTransaction,
      );

      // Act
      const result = await service.call({ userId, text });

      // Assert
      expect(result).toMatchObject({
        success: true,
        data: { transaction: createdTransaction },
      });
      expect(mockTransactionService.getTransactionById).toHaveBeenCalledWith(
        transactionId,
        userId,
      );
    });
  });
});
