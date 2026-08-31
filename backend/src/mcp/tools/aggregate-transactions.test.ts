import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { TransactionType } from "../../models/transaction";
import { AggregateTransactionsService } from "../../services/aggregate-transactions-service";
import { toDateString } from "../../types/date-string";
import { createMockAggregateTransactionsService } from "../../utils/test-utils/services/aggregate-transactions-service-mocks";
import { aggregateTransactions } from "./aggregate-transactions";
import { GUIDES } from "./guides";

describe("aggregateTransactions", () => {
  let mockAggregateTransactionsService: Mocked<AggregateTransactionsService>;
  const userId = faker.string.uuid();
  let deps: {
    aggregateTransactionsService: Mocked<AggregateTransactionsService>;
    userId: string;
  };

  const validGuideToken = GUIDES.basics.token;

  beforeEach(() => {
    mockAggregateTransactionsService = createMockAggregateTransactionsService();
    deps = {
      aggregateTransactionsService: mockAggregateTransactionsService,
      userId,
    };
  });

  // Happy path

  it("delegates to service and returns its result unchanged", async () => {
    // Arrange
    const serviceResult = {
      success: true as const,
      data: [
        {
          type: TransactionType.EXPENSE,
          currency: "USD",
          sum: 897.5,
          count: 16,
          min: 12,
          max: 220,
        },
      ],
    };
    mockAggregateTransactionsService.call.mockResolvedValue(serviceResult);

    // Act
    const result = await aggregateTransactions(
      {
        startDate: toDateString("2026-01-01"),
        endDate: toDateString("2026-01-31"),
        includeTransactionsExcludedFromReports: true,
        guideTokens: [validGuideToken],
      },
      deps,
    );

    // Assert
    expect(result).toBe(serviceResult);
    expect(mockAggregateTransactionsService.call).toHaveBeenCalledWith({
      userId,
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      includeTransactionsExcludedFromReports: true,
    });
  });

  it("passes accountIds, categoryIds, includeUncategorized, types, and groupBy through", async () => {
    // Arrange
    mockAggregateTransactionsService.call.mockResolvedValue({
      success: true,
      data: [],
    });

    // Act
    await aggregateTransactions(
      {
        startDate: toDateString("2026-01-01"),
        endDate: toDateString("2026-01-31"),
        accountIds: ["account-1"],
        categoryIds: ["category-1"],
        includeUncategorized: true,
        types: [TransactionType.EXPENSE],
        includeTransactionsExcludedFromReports: false,
        groupBy: "MONTH",
        guideTokens: [validGuideToken],
      },
      deps,
    );

    // Assert
    expect(mockAggregateTransactionsService.call).toHaveBeenCalledWith(
      expect.objectContaining({
        accountIds: ["account-1"],
        categoryIds: ["category-1"],
        includeUncategorized: true,
        types: [TransactionType.EXPENSE],
        includeTransactionsExcludedFromReports: false,
        groupBy: "MONTH",
      }),
    );
  });

  // Validation failures

  it("rejects without valid basics guide token and does not call service", async () => {
    // Act
    const result = await aggregateTransactions(
      {
        startDate: toDateString("2026-01-01"),
        endDate: toDateString("2026-01-31"),
        includeTransactionsExcludedFromReports: true,
        guideTokens: [],
      },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error:
        "Missing or invalid guide token for: basics. Reload the guide(s) and retry",
    });
    expect(mockAggregateTransactionsService.call).not.toHaveBeenCalled();
  });

  it("does not disclose valid guide token in rejection message", async () => {
    // Act
    const result = await aggregateTransactions(
      {
        startDate: toDateString("2026-01-01"),
        endDate: toDateString("2026-01-31"),
        includeTransactionsExcludedFromReports: true,
        guideTokens: [],
      },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error: expect.not.stringContaining(validGuideToken),
    });
  });

  // Dependency failures

  it("propagates error when service throws", async () => {
    // Arrange
    const errorMessage = faker.lorem.sentence();
    mockAggregateTransactionsService.call.mockRejectedValue(
      new Error(errorMessage),
    );

    // Act
    const promise = aggregateTransactions(
      {
        startDate: toDateString("2026-01-01"),
        endDate: toDateString("2026-01-31"),
        includeTransactionsExcludedFromReports: true,
        guideTokens: [validGuideToken],
      },
      deps,
    );

    // Assert
    await expect(promise).rejects.toThrow(errorMessage);
  });
});
