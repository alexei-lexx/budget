import { faker } from "@faker-js/faker";
import { fakeAccount, fakeCategory } from "../__tests__/utils/factories";
import { CategoryType } from "../models/category";
import { YEAR_RANGE_OFFSET } from "../types/validation";
import { AiDataService } from "./ai-data-service";
import { BusinessError, BusinessErrorCodes } from "./business-error";
import { type InsightInput, InsightService } from "./insight-service";

// Mock the LangchainBedrockAgent
jest.mock("../ai/langchain-bedrock-agent");

const createMockAiDataService = (): jest.Mocked<AiDataService> =>
  ({
    getAvailableAccounts: jest.fn(),
    getAvailableCategories: jest.fn(),
    getFilteredTransactions: jest.fn(),
  }) as unknown as jest.Mocked<AiDataService>;

describe("InsightService", () => {
  let service: InsightService;
  let userId: string;
  let mockAiDataService: jest.Mocked<AiDataService>;

  beforeEach(() => {
    mockAiDataService = createMockAiDataService();

    service = new InsightService(mockAiDataService);

    userId = faker.string.uuid();

    jest.clearAllMocks();

    // Mock the LangchainBedrockAgent to return a simple response
    const { LangchainBedrockAgent } = jest.requireMock(
      "../ai/langchain-bedrock-agent",
    );
    LangchainBedrockAgent.mockImplementation(() => ({
      call: jest.fn().mockResolvedValue({
        answer: "Mocked AI response",
        toolExecutions: [],
      }),
    }));
  });

  describe("validation", () => {
    const validInput: InsightInput = {
      question: "Why did my food spending increase?",
      dateRange: { startDate: "2000-01-01", endDate: "2000-01-31" },
    };

    it("should throw error when userId is empty", async () => {
      // Act & Assert
      const promise = service.call("", validInput);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "User ID is required",
        code: BusinessErrorCodes.INVALID_PARAMETERS,
      });
      expect(mockAiDataService.getAvailableAccounts).not.toHaveBeenCalled();
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
      expect(mockAiDataService.getAvailableAccounts).not.toHaveBeenCalled();
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

    it("should throw error when startDate is empty", async () => {
      // Arrange
      const input: InsightInput = {
        ...validInput,
        dateRange: { ...validInput.dateRange, startDate: "" },
      };

      // Act & Assert
      const promise = service.call(userId, input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Start date is required",
        code: BusinessErrorCodes.INVALID_PARAMETERS,
      });
    });

    it("should throw error when endDate is empty", async () => {
      // Arrange
      const input: InsightInput = {
        ...validInput,
        dateRange: { ...validInput.dateRange, endDate: "" },
      };

      // Act & Assert
      const promise = service.call(userId, input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "End date is required",
        code: BusinessErrorCodes.INVALID_PARAMETERS,
      });
    });

    it("should throw error when startDate is invalid", async () => {
      // Arrange
      const input: InsightInput = {
        ...validInput,
        dateRange: { ...validInput.dateRange, startDate: "not-a-date" },
      };

      // Act & Assert
      const promise = service.call(userId, input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Start date must be a valid date in YYYY-MM-DD format",
        code: BusinessErrorCodes.INVALID_DATE,
      });
    });

    it("should throw error when endDate is invalid", async () => {
      // Arrange
      const input: InsightInput = {
        ...validInput,
        dateRange: { ...validInput.dateRange, endDate: "not-a-date" },
      };

      // Act & Assert
      const promise = service.call(userId, input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "End date must be a valid date in YYYY-MM-DD format",
        code: BusinessErrorCodes.INVALID_DATE,
      });
    });

    it("should throw error when startDate is after endDate", async () => {
      // Arrange
      const input: InsightInput = {
        ...validInput,
        dateRange: { startDate: "2026-02-01", endDate: "2026-01-01" },
      };

      // Act & Assert
      const promise = service.call(userId, input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Start date must be before or equal to end date",
        code: BusinessErrorCodes.INVALID_DATE,
      });
    });

    it("should throw error when date range exceeds 366 days", async () => {
      // Arrange
      const input: InsightInput = {
        ...validInput,
        dateRange: { startDate: "2000-01-01", endDate: "2001-01-02" },
      };

      // Act & Assert
      const promise = service.call(userId, input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Date range cannot exceed 366 days",
        code: BusinessErrorCodes.INVALID_DATE,
      });
    });

    it("should throw error when date year is out of range", async () => {
      // Arrange
      const currentYear = new Date().getFullYear();
      const minYear = currentYear - YEAR_RANGE_OFFSET;
      const maxYear = currentYear + YEAR_RANGE_OFFSET;
      const outOfRangeYear = minYear - 1;
      const input: InsightInput = {
        ...validInput,
        dateRange: {
          startDate: `${outOfRangeYear}-01-01`,
          endDate: `${outOfRangeYear}-01-31`,
        },
      };

      // Act & Assert
      const promise = service.call(userId, input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Start date must be between ${minYear} and ${maxYear}`,
        code: BusinessErrorCodes.INVALID_DATE,
      });
    });
  });

  describe("call", () => {
    const validInput: InsightInput = {
      question: "Why did my food spending increase?",
      dateRange: { startDate: "2000-01-01", endDate: "2000-01-31" },
    };

    it("should return AI response for valid input", async () => {
      // Arrange
      const accounts = [fakeAccount({ userId, name: "Cash" })];
      const categories = [
        fakeCategory({ userId, name: "Food", type: CategoryType.EXPENSE }),
      ];

      mockAiDataService.getAvailableAccounts.mockResolvedValue(accounts);
      mockAiDataService.getAvailableCategories.mockResolvedValue(categories);

      // Act
      const result = await service.call(userId, validInput);

      // Assert
      expect(result).toContain("Mocked AI response");
      expect(mockAiDataService.getAvailableAccounts).toHaveBeenCalledWith(
        userId,
      );
      expect(mockAiDataService.getAvailableCategories).toHaveBeenCalledWith(
        userId,
      );
    });

    it("should return AI response when no accounts or categories exist", async () => {
      // Arrange
      mockAiDataService.getAvailableAccounts.mockResolvedValue([]);
      mockAiDataService.getAvailableCategories.mockResolvedValue([]);

      // Act
      const result = await service.call(userId, validInput);

      // Assert
      expect(result).toContain("Mocked AI response");
      expect(mockAiDataService.getAvailableAccounts).toHaveBeenCalledWith(
        userId,
      );
      expect(mockAiDataService.getAvailableCategories).toHaveBeenCalledWith(
        userId,
      );
    });

    it("should trim question whitespace", async () => {
      // Arrange
      const input: InsightInput = {
        ...validInput,
        question: "  What is my spending?  ",
      };
      mockAiDataService.getAvailableAccounts.mockResolvedValue([]);
      mockAiDataService.getAvailableCategories.mockResolvedValue([]);

      // Act
      await service.call(userId, input);

      // Assert
      const { LangchainBedrockAgent } = jest.requireMock(
        "../ai/langchain-bedrock-agent",
      );
      const mockInstance = LangchainBedrockAgent.mock.results[0].value;
      const callArgs = mockInstance.call.mock.calls[0];

      expect(callArgs[0][0].content).toContain(
        "My question: What is my spending?",
      );
    });

    it("should include accounts and categories metadata in system prompt", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const categoryId = faker.string.uuid();

      const accounts = [
        fakeAccount({ id: accountId, userId, name: "Cash", currency: "USD" }),
      ];
      const categories = [
        fakeCategory({
          id: categoryId,
          userId,
          name: "Food",
          type: CategoryType.EXPENSE,
        }),
      ];

      mockAiDataService.getAvailableAccounts.mockResolvedValue(accounts);
      mockAiDataService.getAvailableCategories.mockResolvedValue(categories);

      // Act
      await service.call(userId, validInput);

      // Assert
      const { LangchainBedrockAgent } = jest.requireMock(
        "../ai/langchain-bedrock-agent",
      );
      const mockInstance = LangchainBedrockAgent.mock.results[0].value;
      const callArgs = mockInstance.call.mock.calls[0];
      const systemPrompt = callArgs[1];

      expect(systemPrompt).toContain("Available Accounts:");
      expect(systemPrompt).toContain(accountId);
      expect(systemPrompt).toContain("Cash");
      expect(systemPrompt).toContain("USD");

      expect(systemPrompt).toContain("Available Categories:");
      expect(systemPrompt).toContain(categoryId);
      expect(systemPrompt).toContain("Food");
      expect(systemPrompt).toContain("EXPENSE");
    });

    it("should propagate error when AiDataService fails", async () => {
      // Arrange
      mockAiDataService.getAvailableAccounts.mockRejectedValue(
        new Error("Service unavailable"),
      );

      // Act & Assert
      const promise = service.call(userId, validInput);

      await expect(promise).rejects.toThrow("Service unavailable");
    });

    it("should append tool executions to response when present", async () => {
      // Arrange
      mockAiDataService.getAvailableAccounts.mockResolvedValue([]);
      mockAiDataService.getAvailableCategories.mockResolvedValue([]);

      const { LangchainBedrockAgent } = jest.requireMock(
        "../ai/langchain-bedrock-agent",
      );
      LangchainBedrockAgent.mockImplementation(() => ({
        call: jest.fn().mockResolvedValue({
          answer: "The total is $150.",
          toolExecutions: [
            {
              tool: "getTransactions",
              input: JSON.stringify({ categoryIds: ["cat-1"] }),
              output: "[]",
            },
            {
              tool: "sum",
              input: JSON.stringify({ numbers: [50, 100] }),
              output: "150",
            },
          ],
        }),
      }));

      // Act
      const result = await service.call(userId, validInput);

      // Assert
      expect(result).toContain("The total is $150.");
      expect(result).toContain("Tools performed:");
      expect(result).toContain("1. getTransactions");
      expect(result).toContain('"categoryIds"');
      expect(result).toContain("2. sum");
      expect(result).toContain('"numbers"');
      expect(result).toContain("Output:");
      expect(result).toContain("150");
    });

    it("should throw error when AI returns empty response", async () => {
      // Arrange
      mockAiDataService.getAvailableAccounts.mockResolvedValue([]);
      mockAiDataService.getAvailableCategories.mockResolvedValue([]);

      const { LangchainBedrockAgent } = jest.requireMock(
        "../ai/langchain-bedrock-agent",
      );
      LangchainBedrockAgent.mockImplementation(() => ({
        call: jest.fn().mockResolvedValue({
          answer: "",
          toolExecutions: [],
        }),
      }));

      // Act & Assert
      const promise = service.call(userId, validInput);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Empty response",
        code: BusinessErrorCodes.EMPTY_RESPONSE,
      });
    });
  });
});
