import { RunnableConfig } from "@langchain/core/runnables";
import { IAccountRepository } from "../models/account";
import { ICategoryRepository } from "../models/category";
import { ITransactionRepository } from "../models/transaction";
import { AiDataService } from "../services/ai-data-service";
import {
  validateBaseToolContext,
  validateToolContextWithDateRange,
} from "./langchain-data-tools";

// Create a real AiDataService instance for tests
// The validation checks instanceof, so we need an actual instance
const createMockAiDataService = (): AiDataService => {
  const mockAccountRepo = {} as IAccountRepository;
  const mockCategoryRepo = {} as ICategoryRepository;
  const mockTransactionRepo = {} as ITransactionRepository;
  return new AiDataService(
    mockAccountRepo,
    mockCategoryRepo,
    mockTransactionRepo,
  );
};

describe("langchain-data-tools", () => {
  let mockAiDataService: AiDataService;
  let userId: string;

  beforeEach(() => {
    mockAiDataService = createMockAiDataService();
    userId = "test-user-id";
    jest.clearAllMocks();
  });

  describe("validateBaseToolContext", () => {
    it("should return valid context when all required fields are present", () => {
      // Arrange
      const config: RunnableConfig<Record<string, unknown>> = {
        configurable: {
          userId,
          aiDataService: mockAiDataService,
        },
      };

      // Act
      const result = validateBaseToolContext(config);

      // Assert
      expect(result).toEqual({
        userId,
        aiDataService: mockAiDataService,
      });
    });

    it("should throw error when tool context is missing", () => {
      // Arrange
      const config: RunnableConfig<Record<string, unknown>> = {
        configurable: undefined,
      };

      // Act & Assert
      expect(() => validateBaseToolContext(config)).toThrow(
        "Tool context is required",
      );
    });

    it("should throw error when userId is missing", () => {
      // Arrange
      const config: RunnableConfig<Record<string, unknown>> = {
        configurable: {
          aiDataService: mockAiDataService,
        },
      };

      // Act & Assert
      expect(() => validateBaseToolContext(config)).toThrow(
        "Tool context must have a valid userId",
      );
    });

    it("should throw error when userId is empty string", () => {
      // Arrange
      const config: RunnableConfig<Record<string, unknown>> = {
        configurable: {
          userId: "",
          aiDataService: mockAiDataService,
        },
      };

      // Act & Assert
      expect(() => validateBaseToolContext(config)).toThrow(
        "Tool context must have a valid userId",
      );
    });

    it("should throw error when userId is not a string", () => {
      // Arrange
      const config: RunnableConfig<Record<string, unknown>> = {
        configurable: {
          userId: 123,
          aiDataService: mockAiDataService,
        },
      };

      // Act & Assert
      expect(() => validateBaseToolContext(config)).toThrow(
        "Tool context must have a valid userId",
      );
    });

    it("should throw error when aiDataService is missing", () => {
      // Arrange
      const config: RunnableConfig<Record<string, unknown>> = {
        configurable: {
          userId,
        },
      };

      // Act & Assert
      expect(() => validateBaseToolContext(config)).toThrow(
        "Tool context must have a valid aiDataService",
      );
    });

    it("should throw error when aiDataService is not an instance of AiDataService", () => {
      // Arrange
      const config: RunnableConfig<Record<string, unknown>> = {
        configurable: {
          userId,
          aiDataService: {},
        },
      };

      // Act & Assert
      expect(() => validateBaseToolContext(config)).toThrow(
        "Tool context must have a valid aiDataService",
      );
    });
  });

  describe("validateToolContextWithDateRange", () => {
    const dateRange = {
      startDate: "2024-01-01",
      endDate: "2024-01-31",
    };

    it("should return valid context when all required fields are present", () => {
      // Arrange
      const config: RunnableConfig<Record<string, unknown>> = {
        configurable: {
          userId,
          dateRange,
          aiDataService: mockAiDataService,
        },
      };

      // Act
      const result = validateToolContextWithDateRange(config);

      // Assert
      expect(result).toEqual({
        userId,
        dateRange,
        aiDataService: mockAiDataService,
      });
    });

    it("should throw error when tool context is missing", () => {
      // Arrange
      const config: RunnableConfig<Record<string, unknown>> = {
        configurable: undefined,
      };

      // Act & Assert
      expect(() => validateToolContextWithDateRange(config)).toThrow(
        "Tool context is required",
      );
    });

    it("should throw error when userId is missing", () => {
      // Arrange
      const config: RunnableConfig<Record<string, unknown>> = {
        configurable: {
          dateRange,
          aiDataService: mockAiDataService,
        },
      };

      // Act & Assert
      expect(() => validateToolContextWithDateRange(config)).toThrow(
        "Tool context must have a valid userId",
      );
    });

    it("should throw error when aiDataService is missing", () => {
      // Arrange
      const config: RunnableConfig<Record<string, unknown>> = {
        configurable: {
          userId,
          dateRange,
        },
      };

      // Act & Assert
      expect(() => validateToolContextWithDateRange(config)).toThrow(
        "Tool context must have a valid aiDataService",
      );
    });

    it("should throw error when dateRange is missing", () => {
      // Arrange
      const config: RunnableConfig<Record<string, unknown>> = {
        configurable: {
          userId,
          aiDataService: mockAiDataService,
        },
      };

      // Act & Assert
      expect(() => validateToolContextWithDateRange(config)).toThrow(
        "Tool context must have a valid dateRange",
      );
    });

    it("should throw error when dateRange is null", () => {
      // Arrange
      const config: RunnableConfig<Record<string, unknown>> = {
        configurable: {
          userId,
          dateRange: null,
          aiDataService: mockAiDataService,
        },
      };

      // Act & Assert
      expect(() => validateToolContextWithDateRange(config)).toThrow(
        "Tool context must have a valid dateRange",
      );
    });

    it("should throw error when dateRange is not an object", () => {
      // Arrange
      const config: RunnableConfig<Record<string, unknown>> = {
        configurable: {
          userId,
          dateRange: "invalid",
          aiDataService: mockAiDataService,
        },
      };

      // Act & Assert
      expect(() => validateToolContextWithDateRange(config)).toThrow(
        "Tool context must have a valid dateRange",
      );
    });

    it("should throw error when startDate is missing", () => {
      // Arrange
      const config: RunnableConfig<Record<string, unknown>> = {
        configurable: {
          userId,
          dateRange: { endDate: "2024-01-31" },
          aiDataService: mockAiDataService,
        },
      };

      // Act & Assert
      expect(() => validateToolContextWithDateRange(config)).toThrow(
        "Tool context dateRange must have a valid startDate",
      );
    });

    it("should throw error when startDate is not a string", () => {
      // Arrange
      const config: RunnableConfig<Record<string, unknown>> = {
        configurable: {
          userId,
          dateRange: { startDate: 123, endDate: "2024-01-31" },
          aiDataService: mockAiDataService,
        },
      };

      // Act & Assert
      expect(() => validateToolContextWithDateRange(config)).toThrow(
        "Tool context dateRange must have a valid startDate",
      );
    });

    it("should throw error when endDate is missing", () => {
      // Arrange
      const config: RunnableConfig<Record<string, unknown>> = {
        configurable: {
          userId,
          dateRange: { startDate: "2024-01-01" },
          aiDataService: mockAiDataService,
        },
      };

      // Act & Assert
      expect(() => validateToolContextWithDateRange(config)).toThrow(
        "Tool context dateRange must have a valid endDate",
      );
    });

    it("should throw error when endDate is not a string", () => {
      // Arrange
      const config: RunnableConfig<Record<string, unknown>> = {
        configurable: {
          userId,
          dateRange: { startDate: "2024-01-01", endDate: 123 },
          aiDataService: mockAiDataService,
        },
      };

      // Act & Assert
      expect(() => validateToolContextWithDateRange(config)).toThrow(
        "Tool context dateRange must have a valid endDate",
      );
    });
  });
});
