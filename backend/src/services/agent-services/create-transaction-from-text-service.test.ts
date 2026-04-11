import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AIMessage, ReactAgent, ToolMessage } from "langchain";
import { CREATE_TRANSACTION_TOOL_NAME } from "../../langchain/tools/create-transaction";
import { fakeTransaction } from "../../utils/test-utils/models/transaction-fakes";
import { AgentTraceMessageType } from "../ports/agent";
import { TransactionService } from "../transaction-service";
import { CreateTransactionFromTextService } from "./create-transaction-from-text-service";

const createMockCreateTransactionAgent = () => ({
  invoke: jest.fn() as jest.MockedFunction<
    (input: unknown, config?: unknown) => Promise<{ messages: unknown[] }>
  >,
});

const createMockTransactionService = (): jest.Mocked<
  Pick<TransactionService, "getTransactionById">
> => ({
  getTransactionById: jest.fn(),
});

describe("CreateTransactionFromTextService", () => {
  const userId = faker.string.uuid();
  const text = "coffee at starbucks for 5 euros";
  let service: CreateTransactionFromTextService;
  let mockCreateTransactionAgent: ReturnType<
    typeof createMockCreateTransactionAgent
  >;
  let mockTransactionService: jest.Mocked<
    Pick<TransactionService, "getTransactionById">
  >;

  beforeEach(() => {
    mockCreateTransactionAgent = createMockCreateTransactionAgent();
    mockTransactionService = createMockTransactionService();

    service = new CreateTransactionFromTextService({
      createTransactionAgent:
        mockCreateTransactionAgent as unknown as ReactAgent,
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
      expect(mockCreateTransactionAgent.invoke).not.toHaveBeenCalled();
    });

    it("should return failure when text is empty", async () => {
      // Act
      const result = await service.call({ userId, text: "" });

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: { message: "Text is required" },
      });
      expect(mockCreateTransactionAgent.invoke).not.toHaveBeenCalled();
    });

    it("should return failure when text is only whitespace", async () => {
      // Act
      const result = await service.call({ userId, text: "   " });

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: { message: "Text is required" },
      });
      expect(mockCreateTransactionAgent.invoke).not.toHaveBeenCalled();
    });
  });

  describe("happy path", () => {
    const transactionId = faker.string.uuid();
    const createdTransaction = fakeTransaction();

    beforeEach(() => {
      // Arrange
      mockCreateTransactionAgent.invoke.mockResolvedValue({
        messages: [
          new AIMessage({ content: "Thinking..." }),
          new AIMessage({
            content: "",
            tool_calls: [
              {
                id: "call_createtx",
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: { amount: 5 },
                type: "tool_call",
              },
            ],
          }),
          new ToolMessage({
            content: JSON.stringify({
              success: true,
              data: { id: transactionId },
            }),
            tool_call_id: "call_createtx",
            name: CREATE_TRANSACTION_TOOL_NAME,
          }),
          new AIMessage({ content: "Transaction created successfully" }),
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
          agentTrace: expect.arrayContaining([
            { type: AgentTraceMessageType.TEXT, content: "Thinking..." },
          ]),
        },
      });
    });

    it("should pass trimmed text to agent", async () => {
      // Act
      await service.call({ userId, text: `    ${text}    ` });

      // Assert
      const [state] = mockCreateTransactionAgent.invoke.mock.calls[0] as [
        { messages: { content: string }[] },
        unknown,
      ];
      expect(state.messages[0].content).toContain(text);
    });

    it("should pass userId as context to agent", async () => {
      // Act
      await service.call({ userId, text });

      // Assert
      expect(mockCreateTransactionAgent.invoke).toHaveBeenCalledWith(
        expect.any(Object),
        { context: { userId } },
      );
    });

    it("should include today's date in user message", async () => {
      // Act
      await service.call({ userId, text });

      // Assert
      const [state] = mockCreateTransactionAgent.invoke.mock.calls[0] as [
        { messages: { content: string }[] },
        unknown,
      ];
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      expect(state.messages[0].content).toContain(`Today is ${today}`);
    });

    it("should not include voice input flag in user message when isVoiceInput is false", async () => {
      // Act
      await service.call({ userId, text, isVoiceInput: false });

      // Assert
      const [state] = mockCreateTransactionAgent.invoke.mock.calls[0] as [
        { messages: { content: string }[] },
        unknown,
      ];
      expect(state.messages[0].content).not.toContain("voice recognition");
    });

    it("should include voice input flag in user message when isVoiceInput is true", async () => {
      // Act
      await service.call({ userId, text, isVoiceInput: true });

      // Assert
      const [state] = mockCreateTransactionAgent.invoke.mock.calls[0] as [
        { messages: { content: string }[] },
        unknown,
      ];
      expect(state.messages[0].content).toContain("voice recognition");
    });
  });

  describe("error paths", () => {
    it("should propagate error when agent call fails", async () => {
      // Arrange
      mockCreateTransactionAgent.invoke.mockRejectedValue(
        new Error("Agent unavailable"),
      );

      // Act & Assert
      await expect(service.call({ userId, text })).rejects.toThrow(
        "Agent unavailable",
      );
      expect(mockTransactionService.getTransactionById).not.toHaveBeenCalled();
    });

    it("should return failure when agent does not attempt to create transaction", async () => {
      // Arrange
      mockCreateTransactionAgent.invoke.mockResolvedValue({
        messages: [new AIMessage({ content: "I need more information." })],
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
      mockCreateTransactionAgent.invoke.mockResolvedValue({
        messages: [
          new AIMessage({
            content: "",
            tool_calls: [
              {
                id: "call_1",
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: { amount: 5 },
                type: "tool_call",
              },
            ],
          }),
          new ToolMessage({
            content: "This is not valid JSON",
            tool_call_id: "call_1",
            name: CREATE_TRANSACTION_TOOL_NAME,
          }),
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

    it("should return failure when tool output does not match expected schema", async () => {
      // Arrange
      mockCreateTransactionAgent.invoke.mockResolvedValue({
        messages: [
          new AIMessage({
            content: "",
            tool_calls: [
              {
                id: "call_1",
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: { amount: 5 },
                type: "tool_call",
              },
            ],
          }),
          new ToolMessage({
            content: JSON.stringify({
              success: true,
              data: {
                currency: "EUR", // missing "id"
              },
            }),
            tool_call_id: "call_1",
            name: CREATE_TRANSACTION_TOOL_NAME,
          }),
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

    it("should return agentTrace from agent response", async () => {
      // Arrange
      mockCreateTransactionAgent.invoke.mockResolvedValue({
        messages: [new AIMessage({ content: "Thinking..." })],
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

    it("should handle multiple creation tool executions and use the last one", async () => {
      // Arrange
      const transactionId = faker.string.uuid();
      const createdTransaction = fakeTransaction();

      mockCreateTransactionAgent.invoke.mockResolvedValue({
        messages: [
          new AIMessage({
            content: "",
            tool_calls: [
              {
                id: "call_first",
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: { amount: 4 },
                type: "tool_call",
              },
            ],
          }),
          new ToolMessage({
            content: JSON.stringify({
              success: true,
              data: { id: faker.string.uuid() },
            }),
            tool_call_id: "call_first",
            name: CREATE_TRANSACTION_TOOL_NAME,
          }),
          new AIMessage({
            content: "",
            tool_calls: [
              {
                id: "call_last",
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: { amount: 5 },
                type: "tool_call",
              },
            ],
          }),
          new ToolMessage({
            content: JSON.stringify({
              success: true,
              data: { id: transactionId },
            }),
            tool_call_id: "call_last",
            name: CREATE_TRANSACTION_TOOL_NAME,
          }),
        ],
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
