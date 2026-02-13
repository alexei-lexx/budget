import { faker } from "@faker-js/faker";
import { z } from "zod";
import {
  fakeAccount,
  fakeCategory,
  fakeTransaction,
} from "../__tests__/utils/factories";
import {
  createMockAccountRepository,
  createMockCategoryRepository,
  createMockTransactionRepository,
} from "../__tests__/utils/mock-repositories";
import { IAccountRepository } from "../models/account";
import { type AIAgent, AnyToolSignature } from "../models/ai-agent";
import { ICategoryRepository } from "../models/category";
import { ITransactionRepository, TransactionType } from "../models/transaction";
import { YEAR_RANGE_OFFSET } from "../types/validation";
import { BusinessError, BusinessErrorCodes } from "./business-error";
import { type InsightInput, InsightService } from "./insight-service";

const createMockAiAgent = (): jest.Mocked<AIAgent> => ({
  call: jest.fn(),
});

describe("InsightService", () => {
  let service: InsightService;
  let userId: string;
  let mockTransactionRepository: jest.Mocked<ITransactionRepository>;
  let mockAccountRepository: jest.Mocked<IAccountRepository>;
  let mockCategoryRepository: jest.Mocked<ICategoryRepository>;
  let mockAiAgent: jest.Mocked<AIAgent>;
  let toolSignatures: AnyToolSignature[];

  beforeEach(() => {
    mockTransactionRepository = createMockTransactionRepository();
    mockAccountRepository = createMockAccountRepository();
    mockCategoryRepository = createMockCategoryRepository();
    mockAiAgent = createMockAiAgent();
    toolSignatures = [
      {
        name: "sum",
        description: "Calculate the sum of a list of numbers",
        func: (input: { a: number; b: number }) =>
          (input.a + input.b).toString(),
        inputSchema: z.object({
          a: z.number(),
          b: z.number(),
        }),
      },
    ];

    service = new InsightService(
      mockTransactionRepository,
      mockAccountRepository,
      mockCategoryRepository,
      mockAiAgent,
      toolSignatures,
    );

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

    it("should return AI response for valid input with transactions", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const categoryId = faker.string.uuid();
      const transactions = [
        fakeTransaction({
          userId,
          accountId,
          categoryId,
          type: TransactionType.EXPENSE,
          amount: 50,
          date: "2000-01-15",
        }),
      ];
      const accounts = [fakeAccount({ id: accountId, userId, name: "Cash" })];
      const categories = [
        fakeCategory({ id: categoryId, userId, name: "Food" }),
      ];

      mockTransactionRepository.findActiveByDateRange.mockResolvedValue(
        transactions,
      );
      mockAccountRepository.findByIds.mockResolvedValue(accounts);
      mockCategoryRepository.findByIds.mockResolvedValue(categories);
      mockAiAgent.call.mockResolvedValue({
        answer: "Your food spending was $50.",
        toolExecutions: [],
      });

      // Act
      const result = await service.call(userId, validInput);

      // Assert
      expect(result).toContain("Your food spending was $50.");
      expect(
        mockTransactionRepository.findActiveByDateRange,
      ).toHaveBeenCalledWith(userId, "2000-01-01", "2000-01-31");
      expect(mockAccountRepository.findByIds).toHaveBeenCalledWith(
        [accountId],
        userId,
      );
      expect(mockCategoryRepository.findByIds).toHaveBeenCalledWith(
        [categoryId],
        userId,
      );
      expect(mockAiAgent.call).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.any(Array),
      );
    });

    it("should return AI response when no transactions found", async () => {
      // Arrange
      mockTransactionRepository.findActiveByDateRange.mockResolvedValue([]);
      mockAiAgent.call.mockResolvedValue({
        answer: "No transactions found for this period.",
        toolExecutions: [],
      });

      // Act
      const result = await service.call(userId, validInput);

      // Assert
      expect(result).toContain("No transactions found for this period.");
      expect(mockAccountRepository.findByIds).not.toHaveBeenCalled();
      expect(mockCategoryRepository.findByIds).not.toHaveBeenCalled();
    });

    it("should trim question whitespace", async () => {
      // Arrange
      const input: InsightInput = {
        ...validInput,
        question: "  What is my spending?  ",
      };
      mockTransactionRepository.findActiveByDateRange.mockResolvedValue([]);
      mockAiAgent.call.mockResolvedValue({ answer: "Answer" });

      // Act
      await service.call(userId, input);

      // Assert
      const callArgs = mockAiAgent.call.mock.calls[0];
      expect(callArgs[0][0].content).toContain(
        "My question: What is my spending?",
      );
    });

    it("should pass system prompt, tools, user message to AI agent", async () => {
      // Arrange
      mockTransactionRepository.findActiveByDateRange.mockResolvedValue([]);
      mockAiAgent.call.mockResolvedValue({ answer: "Answer" });

      // Act
      await service.call(userId, validInput);

      // Assert
      const callArgs = mockAiAgent.call.mock.calls[0];
      const messages = callArgs[0];
      const systemPrompt = callArgs[1];
      const tools = callArgs[2];

      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe("user");
      expect(messages[0].content).toContain("2000-01-01");
      expect(messages[0].content).toContain("2000-01-31");
      expect(messages[0].content).toContain(validInput.question);

      expect(systemPrompt).toContain("You are a personal finance assistant");

      expect(tools).toEqual(toolSignatures);
    });

    it("should handle uncategorized transactions", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const transactions = [
        fakeTransaction({
          userId,
          accountId,
          categoryId: undefined,
          type: TransactionType.EXPENSE,
        }),
      ];
      const accounts = [fakeAccount({ id: accountId, userId, name: "Wallet" })];

      mockTransactionRepository.findActiveByDateRange.mockResolvedValue(
        transactions,
      );
      mockAccountRepository.findByIds.mockResolvedValue(accounts);
      mockCategoryRepository.findByIds.mockResolvedValue([]);
      mockAiAgent.call.mockResolvedValue({ answer: "Answer" });

      // Act
      await service.call(userId, validInput);

      // Assert
      expect(mockCategoryRepository.findByIds).not.toHaveBeenCalled();
      expect(mockAiAgent.call).toHaveBeenCalled();
    });

    it("should propagate error when AI agent fails", async () => {
      // Arrange
      mockTransactionRepository.findActiveByDateRange.mockResolvedValue([]);
      mockAiAgent.call.mockRejectedValue(new Error("AI service unavailable"));

      // Act & Assert
      const promise = service.call(userId, validInput);

      await expect(promise).rejects.toThrow("AI service unavailable");
    });

    it("should append tool executions to response when present", async () => {
      // Arrange
      mockTransactionRepository.findActiveByDateRange.mockResolvedValue([]);
      mockAiAgent.call.mockResolvedValue({
        answer: "The total is $150.",
        toolExecutions: [
          {
            tool: "sum",
            input: JSON.stringify({ values: [50, 100] }),
            output: "150",
          },
        ],
      });

      // Act
      const result = await service.call(userId, validInput);

      // Assert
      expect(result).toContain("The total is $150.");
      expect(result).toContain("Tools performed:");
      expect(result).toContain("1. sum(values: [50, 100]) = 150");
    });
  });
});
