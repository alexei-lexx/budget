import { faker } from "@faker-js/faker";
import { AIAgent } from "../models/ai-agent";
import { YEAR_RANGE_OFFSET } from "../types/validation";
import { AiDataService } from "./ai-data-service";
import { BusinessError, BusinessErrorCodes } from "./business-error";
import { type InsightInput, InsightService } from "./insight-service";

const createMockAiDataService = (): jest.Mocked<AiDataService> =>
  ({
    getAllAccounts: jest.fn(),
    getAllCategories: jest.fn(),
    getFilteredTransactions: jest.fn(),
  }) as unknown as jest.Mocked<AiDataService>;

const createMockAiAgent = (): jest.Mocked<AIAgent> => ({
  call: jest.fn(),
});

describe("InsightService", () => {
  let service: InsightService;
  let userId: string;
  let mockAiDataService: jest.Mocked<AiDataService>;
  let mockAiAgent: jest.Mocked<AIAgent>;

  beforeEach(() => {
    mockAiDataService = createMockAiDataService();
    mockAiAgent = createMockAiAgent();

    service = new InsightService(mockAiDataService, mockAiAgent);

    userId = faker.string.uuid();

    jest.clearAllMocks();
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
      expect(mockAiDataService.getAllAccounts).not.toHaveBeenCalled();
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
      expect(mockAiDataService.getAllAccounts).not.toHaveBeenCalled();
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
      mockAiAgent.call.mockResolvedValue({
        answer: "Your food spending was $50.",
        toolExecutions: [],
      });

      // Act
      const result = await service.call(userId, validInput);

      // Assert
      expect(result).toContain("Your food spending was $50.");
      expect(mockAiAgent.call).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining(
              "Why did my food spending increase?",
            ),
          }),
        ]),
        expect.stringContaining("You are a personal finance assistant."),
        {
          userId,
          dateRange: validInput.dateRange,
          aiDataService: mockAiDataService,
        },
      );
    });

    it("should trim question whitespace", async () => {
      // Arrange
      const input: InsightInput = {
        ...validInput,
        question: "  What is my spending?  ",
      };
      mockAiAgent.call.mockResolvedValue({
        answer: "Answer",
        toolExecutions: [],
      });

      // Act
      await service.call(userId, input);

      // Assert
      expect(mockAiAgent.call).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining(
              "My question: What is my spending?",
            ),
          }),
        ]),
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should propagate error when AiAgent fails", async () => {
      // Arrange
      mockAiAgent.call.mockRejectedValue(new Error("Service unavailable"));

      // Act & Assert
      const promise = service.call(userId, validInput);

      await expect(promise).rejects.toThrow("Service unavailable");
    });

    it("should append tool executions to response when present", async () => {
      // Arrange
      mockAiAgent.call.mockResolvedValue({
        answer: "The total is $150.",
        toolExecutions: [
          {
            tool: "getTransactions",
            input: JSON.stringify({ categoryIds: ["food"] }),
            output: JSON.stringify([
              { amount: 100, categoryId: "food" },
              { amount: 50, categoryId: "food" },
            ]),
          },
          {
            tool: "sum",
            input: JSON.stringify({ numbers: [100, 50] }),
            output: "150",
          },
        ],
      });

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

    it("should throw error when AIAgent returns empty response", async () => {
      // Arrange
      mockAiAgent.call.mockResolvedValue({
        answer: "",
        toolExecutions: [],
      });

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
