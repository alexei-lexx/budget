import { AiInsightsService } from "./ai-insights-service";
import {
  createMockAccountRepository,
  createMockCategoryRepository,
  createMockTransactionRepository,
} from "../__tests__/utils/mock-repositories";
import type { IAccountRepository } from "../models/account";
import type { ICategoryRepository } from "../models/category";
import type { ITransactionRepository } from "../models/transaction";
import { BusinessError } from "./business-error";

const createBedrockClientMock = () => ({
  send: jest.fn(),
});

describe("AiInsightsService", () => {
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
    const bedrockClient = createBedrockClientMock();
    const service = new AiInsightsService(
      transactionRepository,
      accountRepository,
      categoryRepository,
      bedrockClient as never,
    );

    await expect(
      service.call(userId, {
        question: "  ",
        period: { startDate: "2025-01-01", endDate: "2025-01-31" },
      }),
    ).rejects.toThrow(BusinessError);
  });

  it("uses bedrock response text", async () => {
    const bedrockClient = createBedrockClientMock();
    bedrockClient.send.mockResolvedValue({
      output: { message: { content: [{ text: "Insight response" }] } },
    });

    transactionRepository.findActiveByDateRange.mockResolvedValue([]);
    accountRepository.findByIds.mockResolvedValue([]);
    categoryRepository.findByIds.mockResolvedValue([]);

    const service = new AiInsightsService(
      transactionRepository,
      accountRepository,
      categoryRepository,
      bedrockClient as never,
    );

    const result = await service.call(userId, {
      question: "How can I cut costs?",
      period: { startDate: "2025-01-01", endDate: "2025-01-31" },
    });

    expect(result).toBe("Insight response");
    expect(transactionRepository.findActiveByDateRange).toHaveBeenCalledWith(
      userId,
      "2025-01-01",
      "2025-01-31",
    );
    expect(accountRepository.findByIds).not.toHaveBeenCalled();
    expect(categoryRepository.findByIds).not.toHaveBeenCalled();
  });
});
