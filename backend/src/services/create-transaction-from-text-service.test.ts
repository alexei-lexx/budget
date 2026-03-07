import { faker } from "@faker-js/faker";
import { type Agent, ToolSignature } from "../models/agent";
import { fakeTransaction } from "../utils/test-utils/factories";
import { createMockAgentDataService } from "../utils/test-utils/mock-services";
import { type IAgentDataService } from "./agent-data-service";
import { BusinessError, BusinessErrorCodes } from "./business-error";
import { CreateTransactionFromTextService } from "./create-transaction-from-text-service";
import { TransactionService } from "./transaction-service";

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
  let mockAgentDataService: jest.Mocked<IAgentDataService>;
  let mockTransactionService: jest.Mocked<
    Pick<TransactionService, "createTransaction" | "getTransactionById">
  >;

  beforeEach(() => {
    mockAgent = createMockAgent();
    mockAgentDataService = createMockAgentDataService();
    mockTransactionService = createMockTransactionService();

    service = new CreateTransactionFromTextService({
      agentDataService: mockAgentDataService,
      agent: mockAgent,
      transactionService:
        mockTransactionService as unknown as TransactionService,
    });

    jest.clearAllMocks();
  });

  describe("validation", () => {
    it("should throw when userId is empty", async () => {
      // Act
      const promise = service.call("", "some text");

      // Assert
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        code: BusinessErrorCodes.INVALID_PARAMETERS,
        message: "User ID is required",
      });
      expect(mockAgent.call).not.toHaveBeenCalled();
    });

    it("should throw when text is empty", async () => {
      // Act
      const promise = service.call(userId, "");

      // Assert
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        code: BusinessErrorCodes.INVALID_PARAMETERS,
        message: "Text is required",
      });
      expect(mockAgent.call).not.toHaveBeenCalled();
    });

    it("should throw when text is only whitespace", async () => {
      // Act
      const promise = service.call(userId, "   ");

      // Assert
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        code: BusinessErrorCodes.INVALID_PARAMETERS,
        message: "Text is required",
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
            output: `{ "id": "${transactionId}" }`,
          },
          {
            tool: "yetAnotherToolTwo",
            input: "{}",
            output: "{}",
          },
        ],
      });

      mockTransactionService.getTransactionById.mockResolvedValue(
        createdTransaction,
      );
    });

    it("should return the created transaction", async () => {
      // Act
      const result = await service.call(userId, text);

      // Assert
      expect(result).toBe(createdTransaction);
      expect(mockTransactionService.getTransactionById).toHaveBeenCalledWith(
        transactionId,
        userId,
      );
    });

    it("should pass trimmed text to agent", async () => {
      // Act
      await service.call(userId, `    ${text}    `);

      // Assert
      const callArgs = mockAgent.call.mock.calls[0][0];
      expect(callArgs.messages[0].content).toBe(text);
    });

    it("should include all required tools in agent call", async () => {
      // Act
      await service.call(userId, text);

      // Assert
      const callArgs = mockAgent.call.mock.calls[0][0];
      const toolNames =
        callArgs.tools?.map((t: ToolSignature<unknown>) => t.name) ?? [];
      expect(toolNames).toContain("createTransaction");
      expect(toolNames).toContain("getAccounts");
      expect(toolNames).toContain("getCategories");
      expect(toolNames).toContain("getTransactions");
    });

    it("should include today's date in system prompt", async () => {
      // Act
      await service.call(userId, text);

      // Assert
      const callArgs = mockAgent.call.mock.calls[0][0];
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      expect(callArgs.systemPrompt).toContain(`Today is ${today}`);
    });
  });

  describe("error paths", () => {
    it("should propagate error when agent call fails", async () => {
      // Arrange
      mockAgent.call.mockRejectedValue(new Error("Agent unavailable"));

      // Act & Assert
      await expect(service.call(userId, text)).rejects.toThrow(
        "Agent unavailable",
      );
      expect(mockTransactionService.getTransactionById).not.toHaveBeenCalled();
    });

    it("should throw when agent does not attempt to create transaction", async () => {
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
      });

      // Act
      const promise = service.call(userId, text);

      // Assert
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        code: BusinessErrorCodes.AGENT_DECLINED,
        message:
          "Agent did not attempt to create a transaction\nI need more information.",
      });
      expect(mockTransactionService.getTransactionById).not.toHaveBeenCalled();
    });

    it("should throw when tool output is not valid JSON", async () => {
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
      });

      // Act
      const promise = service.call(userId, text);

      // Assert
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        code: BusinessErrorCodes.INVALID_AGENT_RESPONSE,
        message: "Response from agent is not valid JSON",
      });
      expect(mockTransactionService.getTransactionById).not.toHaveBeenCalled();
    });

    it("should throw when tool output does not match expected schema", async () => {
      // Arrange
      mockAgent.call.mockResolvedValue({
        answer: "Creating transaction...",
        toolExecutions: [
          {
            tool: "createTransaction",
            input: '{ "amount": 5 }',
            output: '{ "currency": "EUR" }', // missing "id"
          },
        ],
      });

      // Act
      const promise = service.call(userId, text);

      // Assert
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        code: BusinessErrorCodes.INVALID_AGENT_RESPONSE,
        message: "Response from agent does not match expected format",
      });
      expect(mockTransactionService.getTransactionById).not.toHaveBeenCalled();
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
            output: `{ "id": "first-created-transaction-id" }`,
          },
          {
            tool: "createTransaction",
            input: '{ "amount": 5 }',
            output: `{ "id": "${transactionId}" }`,
          },
        ],
      });
      mockTransactionService.getTransactionById.mockResolvedValue(
        createdTransaction,
      );

      // Act
      const result = await service.call(userId, text);

      // Assert
      expect(result).toBe(createdTransaction);
      expect(mockTransactionService.getTransactionById).toHaveBeenCalledWith(
        transactionId,
        userId,
      );
    });
  });
});
