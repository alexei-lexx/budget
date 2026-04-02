import { faker } from "@faker-js/faker";
import {
  createMockAccountRepository,
  createMockCategoryRepository,
  createMockTransactionRepository,
} from "../../utils/test-utils/mock-repositories";
import {
  type Agent,
  type AgentTraceMessage,
  AgentTraceMessageType,
} from "../ports/agent";
import { type InsightInput, InsightService } from "./insight-service";

const createMockAgent = (): jest.Mocked<Agent> => ({
  call: jest.fn(),
});

describe("InsightService", () => {
  let service: InsightService;
  let userId: string;
  let mockAgent: jest.Mocked<Agent>;

  beforeEach(() => {
    mockAgent = createMockAgent();

    service = new InsightService({
      accountRepository: createMockAccountRepository(),
      categoryRepository: createMockCategoryRepository(),
      transactionRepository: createMockTransactionRepository(),
      agent: mockAgent,
    });

    userId = faker.string.uuid();

    jest.clearAllMocks();
  });

  describe("validation", () => {
    it("should return failure when userId is empty", async () => {
      // Act
      const result = await service.call("", { question: "Valid question?" });

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: { message: "User ID is required" },
      });
      expect(mockAgent.call).not.toHaveBeenCalled();
    });

    it("should return failure when question is empty", async () => {
      // Arrange
      const input: InsightInput = { question: "" };

      // Act
      const result = await service.call(userId, input);

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: { message: "Question is required" },
      });
      expect(mockAgent.call).not.toHaveBeenCalled();
    });

    it("should return failure when question is only whitespace", async () => {
      // Arrange
      const input: InsightInput = { question: "   " };

      // Act
      const result = await service.call(userId, input);

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: { message: "Question is required" },
      });
    });
  });

  describe("call", () => {
    const validInput: InsightInput = {
      question: "Why did my food spending increase?",
    };

    it("should return AI response for valid input", async () => {
      // Arrange
      mockAgent.call.mockResolvedValue({
        answer: "Your food spending was $50.",
        toolExecutions: [],
        agentTrace: [],
      });

      // Act
      const result = await service.call(userId, validInput);

      // Assert
      expect(result).toMatchObject({
        success: true,
        data: {
          answer: expect.stringContaining("Your food spending was $50."),
        },
      });
      expect(mockAgent.call).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayOf(
            expect.objectContaining({
              role: "user",
              content: expect.any(String),
            }),
          ),
          systemPrompt: expect.any(String),
          tools: expect.arrayOf(
            expect.objectContaining({
              name: expect.any(String),
              description: expect.any(String),
            }),
          ),
        }),
      );
    });

    it("should trim question whitespace", async () => {
      // Arrange
      const input: InsightInput = { question: "  What is my spending?  " };
      mockAgent.call.mockResolvedValue({ answer: "Answer", agentTrace: [] });

      // Act
      await service.call(userId, input);

      // Assert
      const callArgs = mockAgent.call.mock.calls[0];
      expect(callArgs[0].messages[0].content).toContain(
        "My question: What is my spending?",
      );
    });

    it("should pass system prompt, tools, user message to AI agent", async () => {
      // Arrange
      mockAgent.call.mockResolvedValue({ answer: "Answer", agentTrace: [] });

      // Act
      await service.call(userId, validInput);

      // Assert
      const callArgs = mockAgent.call.mock.calls[0];
      const { messages, systemPrompt, tools } = callArgs[0];

      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe("user");
      expect(messages[0].content).toContain(validInput.question);

      expect(systemPrompt).toContain("You are a personal finance assistant");

      expect(tools).toBeDefined();
      expect(tools?.map((tool) => tool.name)).toEqual(
        expect.arrayContaining([
          "avg",
          "calculate",
          "getAccounts",
          "getCategories",
          "getTransactions",
          "sum",
        ]),
      );
    });

    it("should propagate error when AI agent fails", async () => {
      // Arrange
      mockAgent.call.mockRejectedValue(new Error("AI service unavailable"));

      // Act & Assert
      const promise = service.call(userId, validInput);

      await expect(promise).rejects.toThrow("AI service unavailable");
    });

    it("should return agentTrace on success", async () => {
      // Arrange
      const agentTrace: AgentTraceMessage[] = [
        { type: AgentTraceMessageType.TEXT, content: "Thinking..." },
      ];
      mockAgent.call.mockResolvedValue({
        answer: "Answer",
        agentTrace,
      });

      // Act
      const result = await service.call(userId, validInput);

      // Assert
      expect(result).toMatchObject({ success: true, data: { agentTrace } });
    });

    it("should return agentTrace on failure", async () => {
      // Arrange
      const agentTrace: AgentTraceMessage[] = [
        { type: AgentTraceMessageType.TEXT, content: "Thinking..." },
      ];
      mockAgent.call.mockResolvedValue({
        answer: "",
        agentTrace,
      });

      // Act
      const result = await service.call(userId, validInput);

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: { message: "Empty response", agentTrace },
      });
    });
  });
});
