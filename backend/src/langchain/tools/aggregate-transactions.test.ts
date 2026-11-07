import { faker } from "@faker-js/faker";
import { Failure, Success } from "ts-result";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { TransactionType } from "../../models/transaction";
import { AggregateTransactionsService } from "../../services/aggregate-transactions-service";
import { createMockAggregateTransactionsService } from "../../utils/test-utils/services/aggregate-transactions-service-mocks";
import { createAggregateTransactionsTool } from "./aggregate-transactions";

describe("createAggregateTransactionsTool", () => {
  let mockAggregateTransactionsService: Mocked<AggregateTransactionsService>;
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockAggregateTransactionsService = createMockAggregateTransactionsService();
  });

  // Happy path

  it("returns tool with correct name", () => {
    // Act
    const aggregateTool = createAggregateTransactionsTool({
      aggregateTransactionsService: mockAggregateTransactionsService,
    });

    // Assert
    expect(aggregateTool.name).toBe("aggregate_transactions");
  });

  it("passes input and userId from context to service", async () => {
    // Arrange
    // Service returns empty aggregation
    mockAggregateTransactionsService.call.mockResolvedValue(Success([]));

    const aggregateTool = createAggregateTransactionsTool({
      aggregateTransactionsService: mockAggregateTransactionsService,
    });

    // Act
    await aggregateTool.invoke(
      {
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        accountIds: ["account-1"],
        categoryIds: ["category-1"],
        includeUncategorized: true,
        types: [TransactionType.EXPENSE],
        includeTransactionsExcludedFromReports: false,
        groupBy: "ACCOUNT",
      },
      { context: { userId } },
    );

    // Assert
    expect(mockAggregateTransactionsService.call).toHaveBeenCalledWith({
      userId,
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      accountIds: ["account-1"],
      categoryIds: ["category-1"],
      includeUncategorized: true,
      types: [TransactionType.EXPENSE],
      includeTransactionsExcludedFromReports: false,
      groupBy: "ACCOUNT",
    });
  });

  it("omits optional fields that model did not send", async () => {
    // Arrange
    // Service returns empty aggregation
    mockAggregateTransactionsService.call.mockResolvedValue(Success([]));

    const aggregateTool = createAggregateTransactionsTool({
      aggregateTransactionsService: mockAggregateTransactionsService,
    });

    // Act
    await aggregateTool.invoke(
      {
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        includeTransactionsExcludedFromReports: true,
      },
      { context: { userId } },
    );

    // Assert
    expect(mockAggregateTransactionsService.call).toHaveBeenCalledWith({
      userId,
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      includeTransactionsExcludedFromReports: true,
    });
  });

  it("omits includeUncategorized when it is false", async () => {
    // Arrange
    // Service returns empty aggregation
    mockAggregateTransactionsService.call.mockResolvedValue(Success([]));

    const aggregateTool = createAggregateTransactionsTool({
      aggregateTransactionsService: mockAggregateTransactionsService,
    });

    // Act
    await aggregateTool.invoke(
      {
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        includeUncategorized: false,
        includeTransactionsExcludedFromReports: true,
      },
      { context: { userId } },
    );

    // Assert
    expect(mockAggregateTransactionsService.call).toHaveBeenCalledWith(
      expect.not.objectContaining({ includeUncategorized: expect.anything() }),
    );
  });

  it("returns service success result", async () => {
    // Arrange
    const items = [
      {
        type: TransactionType.EXPENSE,
        currency: "USD",
        accountId: "account-1",
        sum: 897.5,
        count: 16,
        min: 12,
        max: 220,
      },
    ];

    // Service returns aggregation grouped by account
    mockAggregateTransactionsService.call.mockResolvedValue(Success(items));

    const aggregateTool = createAggregateTransactionsTool({
      aggregateTransactionsService: mockAggregateTransactionsService,
    });

    // Act
    const result = await aggregateTool.invoke(
      {
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        includeTransactionsExcludedFromReports: true,
        groupBy: "ACCOUNT",
      },
      { context: { userId } },
    );

    // Assert
    expect(result).toBeSuccess(items);
  });

  // Validation failures

  it("fails when userId is not valid UUID", async () => {
    // Arrange
    const aggregateTool = createAggregateTransactionsTool({
      aggregateTransactionsService: mockAggregateTransactionsService,
    });

    // Act & Assert
    await expect(
      aggregateTool.invoke(
        {
          startDate: "2026-01-01",
          endDate: "2026-01-31",
          includeTransactionsExcludedFromReports: true,
        },
        { context: { userId: "not-a-uuid" } },
      ),
    ).rejects.toThrow();

    expect(mockAggregateTransactionsService.call).not.toHaveBeenCalled();
  });

  // Dependency failures

  it("fails with service error unchanged", async () => {
    // Arrange
    // Date range is invalid
    mockAggregateTransactionsService.call.mockResolvedValue(
      Failure("Something went wrong"),
    );

    const aggregateTool = createAggregateTransactionsTool({
      aggregateTransactionsService: mockAggregateTransactionsService,
    });

    // Act
    const result = await aggregateTool.invoke(
      {
        startDate: "2026-01-31",
        endDate: "2026-01-01",
        includeTransactionsExcludedFromReports: true,
      },
      { context: { userId } },
    );

    // Assert
    expect(result).toBeFailure("Something went wrong");
  });
});
