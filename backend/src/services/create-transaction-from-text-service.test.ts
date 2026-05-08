import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, vi, type Mocked } from "vitest";
import { CREATE_TRANSACTION_TOOL_NAME } from "../langchain/tools/create-transaction";
import {
  Agent,
  AgentTraceMessage,
  AgentTraceMessageType,
} from "../ports/agent-types";
import { fakeTransaction } from "../utils/test-utils/models/transaction-fakes";
import { createMockTransactionService } from "../utils/test-utils/services/transaction-service-mocks";
import { CreateTransactionFromTextService } from "./create-transaction-from-text-service";
import { TransactionService } from "./transaction-service";

const createMockCreateTransactionAgent = (): Mocked<
  Agent<{ userId: string; isVoiceInput: boolean; today: string }>
> => ({
  invoke: vi.fn(),
});

describe("CreateTransactionFromTextService", () => {
  const userId = faker.string.uuid();
  const text = "coffee at starbucks for 5 euros";

  let mockCreateTransactionAgent: Mocked<
    Agent<{ userId: string; isVoiceInput: boolean; today: string }>
  >;
  let mockTransactionService: Mocked<TransactionService>;
  let service: CreateTransactionFromTextService;

  beforeEach(() => {
    mockCreateTransactionAgent = createMockCreateTransactionAgent();
    mockTransactionService = createMockTransactionService();

    service = new CreateTransactionFromTextService({
      createTransactionAgent: mockCreateTransactionAgent,
      transactionService: mockTransactionService,
    });

    vi.clearAllMocks();
  });

  describe("call", () => {
    // Happy path

    it("returns created transaction", async () => {
      // Arrange
      const transactionId = faker.string.uuid();
      const createdTransaction = fakeTransaction();

      // Agent successfully creates transaction
      mockCreateTransactionAgent.invoke.mockResolvedValue({
        answer: "OK",
        agentTrace: [],
        toolExecutions: [
          {
            tool: CREATE_TRANSACTION_TOOL_NAME,
            input: JSON.stringify({ amount: 5 }),
            output: JSON.stringify({
              success: true,
              data: { id: transactionId },
            }),
          },
        ],
      });

      // Fetching created transaction succeeds
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

    it("returns agentTrace from agent response", async () => {
      // Arrange
      const transactionId = faker.string.uuid();
      const agentTrace: AgentTraceMessage[] = [
        { type: AgentTraceMessageType.TEXT, content: "Thinking..." },
      ];

      // Agent returns thinking trace alongside tool execution
      mockCreateTransactionAgent.invoke.mockResolvedValue({
        answer: "OK",
        agentTrace,
        toolExecutions: [
          {
            tool: CREATE_TRANSACTION_TOOL_NAME,
            input: JSON.stringify({ amount: 5 }),
            output: JSON.stringify({
              success: true,
              data: { id: transactionId },
            }),
          },
        ],
      });

      // Fetching created transaction succeeds
      mockTransactionService.getTransactionById.mockResolvedValue(
        fakeTransaction(),
      );

      // Act
      const result = await service.call({ userId, text });

      // Assert
      expect(result).toMatchObject({
        success: true,
        data: {
          agentTrace: expect.arrayContaining([
            { type: AgentTraceMessageType.TEXT, content: "Thinking..." },
          ]),
        },
      });
    });

    it("uses last createTransaction execution when multiple exist", async () => {
      // Arrange
      const firstTransactionId = faker.string.uuid();
      const lastTransactionId = faker.string.uuid();
      const createdTransaction = fakeTransaction();

      // Agent calls createTransaction twice — only last result is used
      mockCreateTransactionAgent.invoke.mockResolvedValue({
        answer: "OK",
        agentTrace: [],
        toolExecutions: [
          {
            tool: CREATE_TRANSACTION_TOOL_NAME,
            input: JSON.stringify({ amount: 4 }),
            output: JSON.stringify({
              success: true,
              data: { id: firstTransactionId },
            }),
          },
          {
            tool: CREATE_TRANSACTION_TOOL_NAME,
            input: JSON.stringify({ amount: 5 }),
            output: JSON.stringify({
              success: true,
              data: { id: lastTransactionId },
            }),
          },
        ],
      });

      // Fetching created transaction succeeds
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
        lastTransactionId,
        userId,
      );
    });

    describe("agent call parameters", () => {
      beforeEach(() => {
        // Agent successfully creates transaction
        mockCreateTransactionAgent.invoke.mockResolvedValue({
          answer: "OK",
          agentTrace: [],
          toolExecutions: [
            {
              tool: CREATE_TRANSACTION_TOOL_NAME,
              input: JSON.stringify({ amount: 5 }),
              output: JSON.stringify({
                success: true,
                data: { id: faker.string.uuid() },
              }),
            },
          ],
        });

        // Fetching created transaction succeeds
        mockTransactionService.getTransactionById.mockResolvedValue(
          fakeTransaction(),
        );
      });

      it("passes trimmed text to agent", async () => {
        // Act
        await service.call({ userId, text: `    ${text}    ` });

        // Assert
        const [state] = mockCreateTransactionAgent.invoke.mock
          .calls[0] as unknown as [
          { messages: { content: string }[] },
          unknown,
        ];
        expect(state.messages[0].content).toContain(text);
      });

      it("passes userId in context", async () => {
        // Act
        await service.call({ userId, text });

        // Assert
        const [, config] = mockCreateTransactionAgent.invoke.mock.calls[0] as [
          unknown,
          { context: { userId: string } },
        ];
        expect(config.context.userId).toBe(userId);
      });

      it("passes today's date in context", async () => {
        // Act
        await service.call({ userId, text });

        // Assert
        const [, config] = mockCreateTransactionAgent.invoke.mock.calls[0] as [
          unknown,
          { context: { today: string } },
        ];
        expect(config.context.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });

      it("passes isVoiceInput false in context by default", async () => {
        // Act
        await service.call({ userId, text, isVoiceInput: false });

        // Assert
        const [, config] = mockCreateTransactionAgent.invoke.mock.calls[0] as [
          unknown,
          { context: { isVoiceInput: boolean } },
        ];
        expect(config.context.isVoiceInput).toBe(false);
      });

      it("passes isVoiceInput true in context when set", async () => {
        // Act
        await service.call({ userId, text, isVoiceInput: true });

        // Assert
        const [, config] = mockCreateTransactionAgent.invoke.mock.calls[0] as [
          unknown,
          { context: { isVoiceInput: boolean } },
        ];
        expect(config.context.isVoiceInput).toBe(true);
      });
    });

    // Validation failures

    it("returns failure when userId is empty", async () => {
      // Act
      const result = await service.call({ userId: "", text });

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: { message: "User ID is required" },
      });
      expect(mockCreateTransactionAgent.invoke).not.toHaveBeenCalled();
    });

    it("returns failure when text is empty", async () => {
      // Act
      const result = await service.call({ userId, text: "" });

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: { message: "Text is required" },
      });
      expect(mockCreateTransactionAgent.invoke).not.toHaveBeenCalled();
    });

    it("returns failure when text is only whitespace", async () => {
      // Act
      const result = await service.call({ userId, text: "   " });

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: { message: "Text is required" },
      });
      expect(mockCreateTransactionAgent.invoke).not.toHaveBeenCalled();
    });

    // Dependency failures

    it("propagates error when agent throws", async () => {
      // Arrange

      // Agent is unavailable
      mockCreateTransactionAgent.invoke.mockRejectedValue(
        new Error("Agent unavailable"),
      );

      // Act & Assert
      await expect(service.call({ userId, text })).rejects.toThrow(
        "Agent unavailable",
      );
      expect(mockTransactionService.getTransactionById).not.toHaveBeenCalled();
    });

    it("returns failure when agent does not attempt to create transaction", async () => {
      // Arrange

      // Agent responds without invoking createTransaction tool
      mockCreateTransactionAgent.invoke.mockResolvedValue({
        answer: "I need more information.",
        agentTrace: [],
        toolExecutions: [],
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

    it("returns failure when tool output is not valid JSON", async () => {
      // Arrange

      // Agent invokes tool but output is malformed
      mockCreateTransactionAgent.invoke.mockResolvedValue({
        answer: undefined,
        agentTrace: [],
        toolExecutions: [
          {
            tool: CREATE_TRANSACTION_TOOL_NAME,
            input: JSON.stringify({}),
            output: "This is not valid JSON",
          },
        ],
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

    it("returns failure when tool output does not match expected schema", async () => {
      // Arrange

      // Agent invokes tool but returns unexpected JSON shape
      mockCreateTransactionAgent.invoke.mockResolvedValue({
        answer: undefined,
        agentTrace: [],
        toolExecutions: [
          {
            tool: CREATE_TRANSACTION_TOOL_NAME,
            input: JSON.stringify({}),
            output: JSON.stringify({
              success: true,
              data: { currency: "EUR" }, // missing "id"
            }),
          },
        ],
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

    it("returns failure when tool reports transaction creation failed", async () => {
      // Arrange

      // Agent invokes tool but tool itself reports business failure
      mockCreateTransactionAgent.invoke.mockResolvedValue({
        answer: undefined,
        agentTrace: [],
        toolExecutions: [
          {
            tool: CREATE_TRANSACTION_TOOL_NAME,
            input: JSON.stringify({}),
            output: JSON.stringify({
              success: false,
              error: "Account not found",
            }),
          },
        ],
      });

      // Act
      const result = await service.call({ userId, text });

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: { message: "Agent failed to create transaction" },
      });
      expect(mockTransactionService.getTransactionById).not.toHaveBeenCalled();
    });

    it("includes agentTrace in failure response", async () => {
      // Arrange

      // Agent responds with thinking trace but no tool call
      mockCreateTransactionAgent.invoke.mockResolvedValue({
        answer: undefined,
        agentTrace: [
          { type: AgentTraceMessageType.TEXT, content: "Thinking..." },
        ],
        toolExecutions: [],
      });

      // Act
      const result = await service.call({ userId, text });

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: {
          agentTrace: [
            { type: AgentTraceMessageType.TEXT, content: "Thinking..." },
          ],
        },
      });
    });
  });
});
