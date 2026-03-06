import { faker } from "@faker-js/faker";
import { IAccountRepository } from "../models/account";
import { type Agent } from "../models/agent";
import { ICategoryRepository } from "../models/category";
import { ITransactionRepository } from "../models/transaction";
import { toDateString } from "../types/date";
import { YEAR_RANGE_OFFSET } from "../types/validation";
import {
  createMockAccountRepository,
  createMockCategoryRepository,
  createMockTransactionRepository,
} from "../utils/test-utils/mock-repositories";
import { AgentDataService } from "./agent-data-service";
import { MAX_PERIOD_DAYS } from "./agent-tools/agent-data-tools";
import { BusinessError, BusinessErrorCodes } from "./business-error";
import { type InsightInput, InsightService } from "./insight-service";

const createMockAgent = (): jest.Mocked<Agent> => ({
  call: jest.fn(),
});

describe("InsightService", () => {
  let service: InsightService;
  let userId: string;
  let mockTransactionRepository: jest.Mocked<ITransactionRepository>;
  let mockAccountRepository: jest.Mocked<IAccountRepository>;
  let mockCategoryRepository: jest.Mocked<ICategoryRepository>;
  let mockAgent: jest.Mocked<Agent>;
  let agentDataService: AgentDataService;

  beforeEach(() => {
    mockTransactionRepository = createMockTransactionRepository();
    mockAccountRepository = createMockAccountRepository();
    mockCategoryRepository = createMockCategoryRepository();
    mockAgent = createMockAgent();

    agentDataService = new AgentDataService(
      mockAccountRepository,
      mockCategoryRepository,
      mockTransactionRepository,
    );

    service = new InsightService(agentDataService, mockAgent);

    userId = faker.string.uuid();

    jest.clearAllMocks();
  });

  describe("validation", () => {
    const validInput: InsightInput = {
      question: "Why did my food spending increase?",
      startDate: toDateString("2000-01-01"),
      endDate: toDateString("2000-01-31"),
    };

    it("should throw error when userId is empty", async () => {
      // Act & Assert
      const promise = service.call("", validInput);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "User ID is required",
        code: BusinessErrorCodes.INVALID_PARAMETERS,
      });
      expect(
        mockTransactionRepository.findActiveByDateRange,
      ).not.toHaveBeenCalled();
    });

    it("should throw error when question is empty", async () => {
      // Arrange
      const input: InsightInput = { ...validInput, question: "" };

      // Act & Assert
      const promise = service.call(userId, input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Question is required",
        code: BusinessErrorCodes.INVALID_PARAMETERS,
      });
      expect(
        mockTransactionRepository.findActiveByDateRange,
      ).not.toHaveBeenCalled();
    });

    it("should throw error when question is only whitespace", async () => {
      // Arrange
      const input: InsightInput = { ...validInput, question: "   " };

      // Act & Assert
      const promise = service.call(userId, input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Question is required",
        code: BusinessErrorCodes.INVALID_PARAMETERS,
      });
    });

    it("should throw error when startDate is after endDate", async () => {
      // Arrange
      const input: InsightInput = {
        ...validInput,
        startDate: toDateString("2026-02-01"),
        endDate: toDateString("2026-01-01"),
      };

      // Act & Assert
      const promise = service.call(userId, input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Start date must be before or equal to end date",
        code: BusinessErrorCodes.INVALID_DATE,
      });
    });

    it("should throw error when date range exceeds max period days", async () => {
      // Arrange
      const input: InsightInput = {
        ...validInput,
        startDate: toDateString("2000-01-01"),
        endDate: toDateString("2001-01-02"),
      };

      // Act & Assert
      const promise = service.call(userId, input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Date range cannot exceed ${MAX_PERIOD_DAYS} days`,
        code: BusinessErrorCodes.INVALID_DATE,
      });
    });

    it("should throw error when startDate year is out of range", async () => {
      // Arrange
      const currentYear = new Date().getFullYear();
      const minYear = currentYear - YEAR_RANGE_OFFSET;
      const maxYear = currentYear + YEAR_RANGE_OFFSET;
      const outOfRangeYear = minYear - 1;
      const input: InsightInput = {
        ...validInput,
        startDate: toDateString(`${outOfRangeYear}-01-01`),
      };

      // Act & Assert
      const promise = service.call(userId, input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Start date must be between ${minYear} and ${maxYear}`,
        code: BusinessErrorCodes.INVALID_DATE,
      });
    });

    it("should throw error when endDate year is out of range", async () => {
      // Arrange
      const currentYear = new Date().getFullYear();
      const minYear = currentYear - YEAR_RANGE_OFFSET;
      const maxYear = currentYear + YEAR_RANGE_OFFSET;
      const outOfRangeYear = maxYear + 1;
      const input: InsightInput = {
        ...validInput,
        endDate: toDateString(`${outOfRangeYear}-01-31`),
      };

      // Act & Assert
      const promise = service.call(userId, input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `End date must be between ${minYear} and ${maxYear}`,
        code: BusinessErrorCodes.INVALID_DATE,
      });
    });
  });

  describe("call", () => {
    const validInput: InsightInput = {
      question: "Why did my food spending increase?",
      startDate: toDateString("2000-01-01"),
      endDate: toDateString("2000-01-31"),
    };

    it("should return AI response for valid input", async () => {
      // Arrange
      mockAgent.call.mockResolvedValue({
        answer: "Your food spending was $50.",
        toolExecutions: [],
      });

      // Act
      const result = await service.call(userId, validInput);

      // Assert
      expect(result).toContain("Your food spending was $50.");
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
      const input: InsightInput = {
        ...validInput,
        question: "  What is my spending?  ",
      };
      mockTransactionRepository.findActiveByDateRange.mockResolvedValue([]);
      mockAgent.call.mockResolvedValue({ answer: "Answer" });

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
      mockTransactionRepository.findActiveByDateRange.mockResolvedValue([]);
      mockAgent.call.mockResolvedValue({ answer: "Answer" });

      // Act
      await service.call(userId, validInput);

      // Assert
      const callArgs = mockAgent.call.mock.calls[0];
      const { messages, systemPrompt, tools } = callArgs[0];

      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe("user");
      expect(messages[0].content).toContain("2000-01-01");
      expect(messages[0].content).toContain("2000-01-31");
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

    it("should append tool executions to response when present", async () => {
      // Arrange
      mockTransactionRepository.findActiveByDateRange.mockResolvedValue([]);
      mockAgent.call.mockResolvedValue({
        answer: "The total is $150.",
        toolExecutions: [
          {
            tool: "sum",
            input: "[50, 100]",
            output: "150",
          },
          {
            tool: "avg",
            input: "[50, 100]",
            output: "75",
          },
        ],
      });

      // Act
      const result = await service.call(userId, validInput);

      // Assert
      expect(result).toContain("The total is $150.");
      expect(result).toContain("Tools performed:");
      expect(result).toContain("1. sum");
      expect(result).toContain("2. avg");
    });
  });
});
