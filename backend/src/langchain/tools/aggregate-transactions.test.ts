import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { TransactionType } from "../../models/transaction";
import { TransactionRepository } from "../../ports/transaction-repository";
import { toDateString } from "../../types/date";
import { fakeTransaction } from "../../utils/test-utils/models/transaction-fakes";
import { createMockTransactionRepository } from "../../utils/test-utils/repositories/transaction-repository-mocks";
import { createAggregateTransactionsTool } from "./aggregate-transactions";
import { MAX_PERIOD_DAYS } from "./get-transactions";

describe("createAggregateTransactionsTool", () => {
  let mockTransactionRepository: jest.Mocked<TransactionRepository>;
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockTransactionRepository = createMockTransactionRepository();
  });

  it("returns tool with correct name", () => {
    const aggregateTool = createAggregateTransactionsTool({
      transactionRepository: mockTransactionRepository,
    });

    expect(aggregateTool.name).toBe("aggregate_transactions");
  });

  it("throws when userId in context is not valid UUID", async () => {
    const aggregateTool = createAggregateTransactionsTool({
      transactionRepository: mockTransactionRepository,
    });

    await expect(
      aggregateTool.invoke(
        { startDate: "2000-01-01", endDate: "2000-01-31" },
        { context: { userId: "not-a-uuid" } },
      ),
    ).rejects.toThrow();
  });

  it("rejects when startDate is after endDate", async () => {
    const aggregateTool = createAggregateTransactionsTool({
      transactionRepository: mockTransactionRepository,
    });

    const result = await aggregateTool.invoke(
      { startDate: "2000-01-20", endDate: "2000-01-10" },
      { context: { userId } },
    );

    expect(mockTransactionRepository.findManyByUserId).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      error: "startDate must not be after endDate",
    });
  });

  it("rejects when date range exceeds max period days", async () => {
    const aggregateTool = createAggregateTransactionsTool({
      transactionRepository: mockTransactionRepository,
    });

    const result = await aggregateTool.invoke(
      { startDate: "2000-01-01", endDate: "2001-01-02" },
      { context: { userId } },
    );

    expect(mockTransactionRepository.findManyByUserId).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      error: `Date range must not exceed ${MAX_PERIOD_DAYS} days`,
    });
  });

  it("returns zero aggregation when no transactions exist", async () => {
    mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

    const aggregateTool = createAggregateTransactionsTool({
      transactionRepository: mockTransactionRepository,
    });

    const result = await aggregateTool.invoke(
      { startDate: "2000-01-01", endDate: "2000-01-31" },
      { context: { userId } },
    );

    expect(result).toEqual({ success: true, data: { sum: {}, count: {} } });
  });

  it("aggregates transactions by currency", async () => {
    mockTransactionRepository.findManyByUserId.mockResolvedValue([
      fakeTransaction({
        type: TransactionType.EXPENSE,
        amount: 100,
        currency: "EUR",
      }),
      fakeTransaction({
        type: TransactionType.INCOME,
        amount: 200,
        currency: "EUR",
      }),
      fakeTransaction({
        type: TransactionType.EXPENSE,
        amount: 50,
        currency: "USD",
      }),
    ]);

    const aggregateTool = createAggregateTransactionsTool({
      transactionRepository: mockTransactionRepository,
    });

    const result = await aggregateTool.invoke(
      { startDate: "2000-01-01", endDate: "2000-01-31" },
      { context: { userId } },
    );

    expect(result).toEqual({
      success: true,
      data: {
        sum: { EUR: 100, USD: -50 },
        count: { EUR: 2, USD: 1 },
      },
    });
  });

  it("filters by date range", async () => {
    mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

    const aggregateTool = createAggregateTransactionsTool({
      transactionRepository: mockTransactionRepository,
    });

    await aggregateTool.invoke(
      { startDate: "2000-01-10", endDate: "2000-01-20" },
      { context: { userId } },
    );

    expect(mockTransactionRepository.findManyByUserId).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        dateAfter: toDateString("2000-01-10"),
        dateBefore: toDateString("2000-01-20"),
      }),
    );
  });
});
