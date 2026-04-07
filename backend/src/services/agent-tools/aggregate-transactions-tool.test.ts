import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { TransactionType } from "../../models/transaction";
import { toDateString } from "../../types/date";
import { fakeTransaction } from "../../utils/test-utils/models/transaction-fakes";
import { createMockTransactionRepository } from "../../utils/test-utils/repositories/transaction-repository-mocks";
import { TransactionRepository } from "../ports/transaction-repository";
import { createAggregateTransactionsTool } from "./aggregate-transactions-tool";
import { MAX_PERIOD_DAYS } from "./get-transactions-tool";

describe("createAggregateTransactionsTool", () => {
  let mockTransactionRepository: jest.Mocked<TransactionRepository>;
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockTransactionRepository = createMockTransactionRepository();
  });

  it("should return tool with correct name", () => {
    const tool = createAggregateTransactionsTool({
      transactionRepository: mockTransactionRepository,
      userId,
    });

    expect(tool.name).toBe("aggregateTransactions");
  });

  it("should reject when startDate is after endDate", async () => {
    const tool = createAggregateTransactionsTool({
      transactionRepository: mockTransactionRepository,
      userId,
    });

    const result = await tool.func({
      startDate: "2000-01-20",
      endDate: "2000-01-10",
    });

    expect(mockTransactionRepository.findManyByUserId).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      error: "startDate must not be after endDate",
    });
  });

  it("should reject when date range exceeds max period days", async () => {
    const tool = createAggregateTransactionsTool({
      transactionRepository: mockTransactionRepository,
      userId,
    });

    const result = await tool.func({
      startDate: "2000-01-01",
      endDate: "2001-01-02",
    });

    expect(mockTransactionRepository.findManyByUserId).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      error: `Date range must not exceed ${MAX_PERIOD_DAYS} days`,
    });
  });

  it("should return empty aggregation when no transactions found", async () => {
    mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

    const tool = createAggregateTransactionsTool({
      transactionRepository: mockTransactionRepository,
      userId,
    });

    const result = await tool.func({
      startDate: "2024-01-01",
      endDate: "2024-01-31",
    });

    expect(result).toEqual({
      success: true,
      data: { sum: {}, count: {} },
    });
  });

  it("should aggregate single-currency transactions correctly", async () => {
    mockTransactionRepository.findManyByUserId.mockResolvedValue([
      fakeTransaction({
        type: TransactionType.INCOME,
        amount: 1000,
        currency: "USD",
      }),
      fakeTransaction({
        type: TransactionType.EXPENSE,
        amount: 200,
        currency: "USD",
      }),
      fakeTransaction({
        type: TransactionType.EXPENSE,
        amount: 300,
        currency: "USD",
      }),
    ]);

    const tool = createAggregateTransactionsTool({
      transactionRepository: mockTransactionRepository,
      userId,
    });

    const result = await tool.func({
      startDate: "2024-01-01",
      endDate: "2024-01-31",
    });

    // sum: 1000 - 200 - 300 = 500; count: 3
    expect(result).toEqual({
      success: true,
      data: {
        sum: { USD: 500 },
        count: { USD: 3 },
      },
    });
  });

  it("should aggregate multi-currency transactions separately", async () => {
    mockTransactionRepository.findManyByUserId.mockResolvedValue([
      fakeTransaction({
        type: TransactionType.INCOME,
        amount: 500,
        currency: "USD",
      }),
      fakeTransaction({
        type: TransactionType.EXPENSE,
        amount: 100,
        currency: "USD",
      }),
      fakeTransaction({
        type: TransactionType.INCOME,
        amount: 200,
        currency: "EUR",
      }),
    ]);

    const tool = createAggregateTransactionsTool({
      transactionRepository: mockTransactionRepository,
      userId,
    });

    const result = await tool.func({
      startDate: "2024-01-01",
      endDate: "2024-01-31",
    });

    expect(result).toEqual({
      success: true,
      data: {
        sum: { USD: 400, EUR: 200 },
        count: { USD: 2, EUR: 1 },
      },
    });
  });

  it("should filter by date range", async () => {
    mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

    const tool = createAggregateTransactionsTool({
      transactionRepository: mockTransactionRepository,
      userId,
    });

    await tool.func({
      startDate: "2024-01-01",
      endDate: "2024-01-31",
    });

    expect(mockTransactionRepository.findManyByUserId).toHaveBeenCalledWith(
      userId,
      {
        dateAfter: toDateString("2024-01-01"),
        dateBefore: toDateString("2024-01-31"),
      },
    );
  });

  it("should filter by accountIds", async () => {
    const accountId = faker.string.uuid();
    mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

    const tool = createAggregateTransactionsTool({
      transactionRepository: mockTransactionRepository,
      userId,
    });

    await tool.func({
      startDate: "2024-01-01",
      endDate: "2024-01-31",
      accountIds: [accountId],
    });

    expect(mockTransactionRepository.findManyByUserId).toHaveBeenCalledWith(
      userId,
      {
        dateAfter: toDateString("2024-01-01"),
        dateBefore: toDateString("2024-01-31"),
        accountIds: [accountId],
      },
    );
  });

  it("should filter by categoryIds", async () => {
    const categoryId = faker.string.uuid();
    mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

    const tool = createAggregateTransactionsTool({
      transactionRepository: mockTransactionRepository,
      userId,
    });

    await tool.func({
      startDate: "2024-01-01",
      endDate: "2024-01-31",
      categoryIds: [categoryId],
    });

    expect(mockTransactionRepository.findManyByUserId).toHaveBeenCalledWith(
      userId,
      {
        dateAfter: toDateString("2024-01-01"),
        dateBefore: toDateString("2024-01-31"),
        categoryIds: [categoryId],
      },
    );
  });

  it("should filter by types", async () => {
    mockTransactionRepository.findManyByUserId.mockResolvedValue([
      fakeTransaction({
        type: TransactionType.EXPENSE,
        amount: 150,
        currency: "USD",
      }),
    ]);

    const tool = createAggregateTransactionsTool({
      transactionRepository: mockTransactionRepository,
      userId,
    });

    const result = await tool.func({
      startDate: "2024-01-01",
      endDate: "2024-01-31",
      types: [TransactionType.EXPENSE],
    });

    expect(mockTransactionRepository.findManyByUserId).toHaveBeenCalledWith(
      userId,
      {
        dateAfter: toDateString("2024-01-01"),
        dateBefore: toDateString("2024-01-31"),
        types: [TransactionType.EXPENSE],
      },
    );
    expect(result).toEqual({
      success: true,
      data: {
        sum: { USD: -150 },
        count: { USD: 1 },
      },
    });
  });
});
