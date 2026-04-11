import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AIMessage, ReactAgent, ToolMessage } from "langchain";
import { CREATE_TRANSACTION_TOOL_NAME } from "../../langchain/tools/create-transaction";
import { fakeTransaction } from "../../utils/test-utils/models/transaction-fakes";
import { AgentTraceMessageType } from "../ports/agent";
import { TransactionService } from "../transaction-service";
import { CreateTransactionFromTextService } from "./create-transaction-from-text-service";

describe("CreateTransactionFromTextService", () => {
  const userId = faker.string.uuid();
  const text = "coffee at starbucks for 5 euros";

  let mockCreateTransactionAgent: {
    invoke: jest.MockedFunction<
      (input: unknown, config?: unknown) => Promise<{ messages: unknown[] }>
    >;
  };
  let mockTransactionService: jest.Mocked<
    Pick<TransactionService, "getTransactionById">
  >;
  let service: CreateTransactionFromTextService;

  beforeEach(() => {
    mockCreateTransactionAgent = { invoke: jest.fn() };
    mockTransactionService = { getTransactionById: jest.fn() };

    service = new CreateTransactionFromTextService({
      createTransactionAgent:
        mockCreateTransactionAgent as unknown as ReactAgent,
      transactionService:
        mockTransactionService as unknown as TransactionService,
    });
  });

  describe("call", () => {
    // Happy path

    it("should return the created transaction", async () => {
      // Arrange
      const transactionId = faker.string.uuid();
      const createdTransaction = fakeTransaction();

      // Agent successfully creates a transaction
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
              data: { id: transactionId },
            }),
            tool_call_id: "call_1",
            name: CREATE_TRANSACTION_TOOL_NAME,
          }),
          new AIMessage({ content: "OK" }),
        ],
      });

      // Fetch by ID returns the persisted transaction
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

    it("should return agentTrace from agent response", async () => {
      // Arrange
      const transactionId = faker.string.uuid();

      // Agent responds with a thinking trace before the tool call
      mockCreateTransactionAgent.invoke.mockResolvedValue({
        messages: [
          new AIMessage({ content: "Thinking..." }),
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
              data: { id: transactionId },
            }),
            tool_call_id: "call_1",
            name: CREATE_TRANSACTION_TOOL_NAME,
          }),
          new AIMessage({ content: "OK" }),
        ],
      });
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

    it("should use the last createTransaction execution when multiple exist", async () => {
      // Arrange
      const firstTransactionId = faker.string.uuid();
      const lastTransactionId = faker.string.uuid();
      const createdTransaction = fakeTransaction();

      // Agent calls createTransaction twice — only the last result should be used
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
              data: { id: firstTransactionId },
            }),
            tool_call_id: "call_first",
            name: CREATE_TRANSACTION_TOOL_NAME,
          }),
          new ToolMessage({
            content: JSON.stringify({
              success: true,
              data: { id: lastTransactionId },
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
        lastTransactionId,
        userId,
      );
    });

    describe("agent call parameters", () => {
      beforeEach(() => {
        const transactionId = faker.string.uuid();

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
                data: { id: transactionId },
              }),
              tool_call_id: "call_1",
              name: CREATE_TRANSACTION_TOOL_NAME,
            }),
            new AIMessage({ content: "OK" }),
          ],
        });
        mockTransactionService.getTransactionById.mockResolvedValue(
          fakeTransaction(),
        );
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

      it("should pass userId in context", async () => {
        // Act
        await service.call({ userId, text });

        // Assert
        const [, config] = mockCreateTransactionAgent.invoke.mock.calls[0] as [
          unknown,
          { context: { userId: string } },
        ];
        expect(config.context.userId).toBe(userId);
      });

      it("should pass today's date in context", async () => {
        // Act
        await service.call({ userId, text });

        // Assert
        const [, config] = mockCreateTransactionAgent.invoke.mock.calls[0] as [
          unknown,
          { context: { today: string } },
        ];
        expect(config.context.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });

      it("should pass isVoiceInput false in context by default", async () => {
        // Act
        await service.call({ userId, text, isVoiceInput: false });

        // Assert
        const [, config] = mockCreateTransactionAgent.invoke.mock.calls[0] as [
          unknown,
          { context: { isVoiceInput: boolean } },
        ];
        expect(config.context.isVoiceInput).toBe(false);
      });

      it("should pass isVoiceInput true in context when set", async () => {
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

    it("should return failure when userId is empty", async () => {
      // Act
      const result = await service.call({ userId: "", text });

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

    // Dependency failures

    it("should propagate error when agent throws", async () => {
      // Arrange

      // Agent call fails with an infrastructure error
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

      // Agent responds without invoking the createTransaction tool
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

      // Agent invokes the tool but the output is malformed
      mockCreateTransactionAgent.invoke.mockResolvedValue({
        messages: [
          new AIMessage({
            content: "",
            tool_calls: [
              {
                id: "call_1",
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: {},
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

      // Agent invokes the tool but returns an unexpected JSON shape
      mockCreateTransactionAgent.invoke.mockResolvedValue({
        messages: [
          new AIMessage({
            content: "",
            tool_calls: [
              {
                id: "call_1",
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: {},
                type: "tool_call",
              },
            ],
          }),
          new ToolMessage({
            content: JSON.stringify({
              success: true,
              data: { currency: "EUR" }, // missing "id"
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

    it("should return failure when tool reports transaction creation failed", async () => {
      // Arrange

      // Agent invokes the tool but the tool itself reports a business failure
      mockCreateTransactionAgent.invoke.mockResolvedValue({
        messages: [
          new AIMessage({
            content: "",
            tool_calls: [
              {
                id: "call_1",
                name: CREATE_TRANSACTION_TOOL_NAME,
                args: {},
                type: "tool_call",
              },
            ],
          }),
          new ToolMessage({
            content: JSON.stringify({
              success: false,
              error: "Account not found",
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
        error: { message: "Agent failed to create transaction" },
      });
      expect(mockTransactionService.getTransactionById).not.toHaveBeenCalled();
    });

    it("should include agentTrace in failure response", async () => {
      // Arrange

      // Agent responds with a thinking trace but no tool call
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
  });
});
