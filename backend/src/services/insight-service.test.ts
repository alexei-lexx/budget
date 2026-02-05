import {
  createMockAccountRepository,
  createMockCategoryRepository,
  createMockTransactionRepository,
} from "../__tests__/utils/mock-repositories";
import type { IAccountRepository } from "../models/account";
import type { ICategoryRepository } from "../models/category";
import type { ITransactionRepository } from "../models/transaction";
import type { AiModelClient } from "./ai-model-client";
import { BusinessError } from "./business-error";
import { InsightService } from "./insight-service";

const createAiModelClientMock = (): AiModelClient => ({
  generateResponse: jest.fn(),
});

describe("InsightService", () => {
  const userId = "user-123";
  let transactionRepository: jest.Mocked<ITransactionRepository>;
  let accountRepository: jest.Mocked<IAccountRepository>;
  let categoryRepository: jest.Mocked<ICategoryRepository>;

  beforeEach(() => {
    transactionRepository = createMockTransactionRepository();
    accountRepository = createMockAccountRepository();
    categoryRepository = createMockCategoryRepository();
  });

  it("throws when question is empty", async () => {
    const aiModelClient = createAiModelClientMock();
    const service = new InsightService(
      transactionRepository,
      accountRepository,
      categoryRepository,
      aiModelClient,
    );

    await expect(
      service.call(userId, {
        question: "  ",
        dateRange: { startDate: "2025-01-01", endDate: "2025-01-31" },
      }),
    ).rejects.toThrow(BusinessError);
  });

  it("uses model response text", async () => {
    const aiModelClient = createAiModelClientMock();
    (aiModelClient.generateResponse as jest.Mock).mockResolvedValue(
      "Insight response",
    );

    transactionRepository.findActiveByDateRange.mockResolvedValue([]);
    accountRepository.findByIds.mockResolvedValue([]);
    categoryRepository.findByIds.mockResolvedValue([]);

    const service = new InsightService(
      transactionRepository,
      accountRepository,
      categoryRepository,
      aiModelClient,
    );

    const result = await service.call(userId, {
      question: "How can I cut costs?",
      dateRange: { startDate: "2025-01-01", endDate: "2025-01-31" },
    });

    expect(result).toBe("Insight response");
    expect(aiModelClient.generateResponse).toHaveBeenCalled();
    expect(transactionRepository.findActiveByDateRange).toHaveBeenCalledWith(
      userId,
      "2025-01-01",
      "2025-01-31",
    );
    expect(accountRepository.findByIds).not.toHaveBeenCalled();
    expect(categoryRepository.findByIds).not.toHaveBeenCalled();
  });
});
