import { faker } from "@faker-js/faker";
import { type Agent, ToolSignature } from "../models/agent";
import { fakeTransaction } from "../utils/test-utils/factories";
import { AgentDataService } from "./agent-data-service";
import { BusinessError, BusinessErrorCodes } from "./business-error";
import { CreateTransactionFromTextService } from "./create-transaction-from-text-service";
import { TransactionService } from "./transaction-service";

const createMockAgentDataService = (): jest.Mocked<AgentDataService> =>
  ({
    getAllAccounts: jest.fn(),
    getAllCategories: jest.fn(),
    getFilteredTransactions: jest.fn(),
  }) as unknown as jest.Mocked<AgentDataService>;

const createMockAgent = (): jest.Mocked<Agent> => ({
  call: jest.fn(),
});

const createMockTransactionService = (): jest.Mocked<
  Pick<TransactionService, "createTransaction" | "getTransactionById">
> => ({
  createTransaction: jest.fn(),
  getTransactionById: jest.fn(),
});

function buildSuccessfulAgentResponse(transactionId: string) {
  return {
    answer: JSON.stringify({
      success: true,
      transaction: { id: transactionId },
    }),
  };
}

describe("CreateTransactionFromTextService", () => {
  const userId = faker.string.uuid();
  const text = "coffee at starbucks for 5 euros";
  let service: CreateTransactionFromTextService;
  let mockAgent: jest.Mocked<Agent>;
  let mockAgentDataService: jest.Mocked<AgentDataService>;
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
    it("should return the created transaction when agent responds with success", async () => {
      // Arrange
      const transactionId = faker.string.uuid();
      const createdTransaction = fakeTransaction();

      mockAgent.call.mockResolvedValue(
        buildSuccessfulAgentResponse(transactionId),
      );
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

    it("should pass trimmed text to agent", async () => {
      // Arrange
      const transactionId = faker.string.uuid();
      mockAgent.call.mockResolvedValue(
        buildSuccessfulAgentResponse(transactionId),
      );
      mockTransactionService.getTransactionById.mockResolvedValue(
        fakeTransaction(),
      );

      // Act
      await service.call(userId, `    ${text}    `);

      // Assert
      const callArgs = mockAgent.call.mock.calls[0][0];
      expect(callArgs.messages[0].content).toBe(text);
    });

    it("should include all required tools in agent call", async () => {
      // Arrange
      const transactionId = faker.string.uuid();
      mockAgent.call.mockResolvedValue(
        buildSuccessfulAgentResponse(transactionId),
      );
      mockTransactionService.getTransactionById.mockResolvedValue(
        fakeTransaction(),
      );

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
      // Arrange
      const transactionId = faker.string.uuid();
      mockAgent.call.mockResolvedValue(
        buildSuccessfulAgentResponse(transactionId),
      );
      mockTransactionService.getTransactionById.mockResolvedValue(
        fakeTransaction(),
      );

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
    });

    it("should throw BusinessError when agent returns empty answer", async () => {
      // Arrange
      mockAgent.call.mockResolvedValue({ answer: "" });

      // Act
      const promise = service.call(userId, text);

      // Assert
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        code: BusinessErrorCodes.EMPTY_RESPONSE,
        message: "Empty response from agent",
      });
      expect(mockTransactionService.getTransactionById).not.toHaveBeenCalled();
    });

    it("should throw BusinessError when agent answers with non-JSON", async () => {
      // Arrange
      mockAgent.call.mockResolvedValue({
        answer: "This is not JSON",
      });

      // Act
      const promise = service.call(userId, text);

      // Assert
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        code: BusinessErrorCodes.INVALID_AGENT_RESPONSE,
        message: "Invalid JSON response from agent",
      });
      expect(mockTransactionService.getTransactionById).not.toHaveBeenCalled();
    });

    it("should throw BusinessError when agent answers with JSON that doesn't match expected format", async () => {
      // Arrange
      mockAgent.call.mockResolvedValue({
        answer: JSON.stringify({}),
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

    it("should throw BusinessError when agent answers with error", async () => {
      // Arrange
      mockAgent.call.mockResolvedValue({
        answer: JSON.stringify({
          success: false,
          error: "Could not determine the amount from the text.",
        }),
      });

      // Act
      const promise = service.call(userId, text);

      // Assert
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        code: BusinessErrorCodes.AGENT_DECLINED,
        message: "Could not determine the amount from the text.",
      });
      expect(mockTransactionService.getTransactionById).not.toHaveBeenCalled();
    });
  });
});
