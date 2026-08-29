import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { TransactionType } from "../../models/transaction";
import { TransactionRepository } from "../../ports/transaction-repository";
import { toDateString } from "../../types/date-string";
import { fakeTransaction } from "../../utils/test-utils/models/transaction-fakes";
import { createMockTransactionRepository } from "../../utils/test-utils/repositories/transaction-repository-mocks";
import { getTransactions } from "./get-transactions";
import { GUIDES } from "./guides";

describe("getTransactions", () => {
  let mockTransactionRepository: Mocked<TransactionRepository>;
  const userId = faker.string.uuid();
  let deps: {
    transactionRepository: Mocked<TransactionRepository>;
    userId: string;
  };

  const validGuideToken = GUIDES.basics.token;

  beforeEach(() => {
    mockTransactionRepository = createMockTransactionRepository();
    deps = { transactionRepository: mockTransactionRepository, userId };
  });

  // Happy path

  it("scopes lookup to given userId and date range", async () => {
    // Arrange
    mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

    // Act
    await getTransactions(
      {
        startDate: toDateString("2026-01-01"),
        endDate: toDateString("2026-01-31"),
        guideTokens: [validGuideToken],
      },
      deps,
    );

    // Assert
    expect(mockTransactionRepository.findManyByUserId).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        dateAfter: "2026-01-01",
        dateBefore: "2026-01-31",
      }),
    );
  });

  it("passes accountIds, categoryIds, and types filters through", async () => {
    // Arrange
    mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

    // Act
    await getTransactions(
      {
        startDate: toDateString("2026-01-01"),
        endDate: toDateString("2026-01-31"),
        accountIds: ["account-1"],
        categoryIds: ["category-1"],
        types: [TransactionType.EXPENSE],
        guideTokens: [validGuideToken],
      },
      deps,
    );

    // Assert
    expect(mockTransactionRepository.findManyByUserId).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        accountIds: ["account-1"],
        categoryIds: ["category-1"],
        types: [TransactionType.EXPENSE],
      }),
    );
  });

  it("returns transaction details", async () => {
    // Arrange
    const transaction = fakeTransaction({
      accountId: "account-1",
      categoryId: "category-1",
      type: TransactionType.EXPENSE,
      amount: 42,
      currency: "USD",
      date: toDateString("2026-01-15"),
      description: "Coffee",
    });
    mockTransactionRepository.findManyByUserId.mockResolvedValue([transaction]);

    // Act
    const result = await getTransactions(
      {
        startDate: toDateString("2026-01-01"),
        endDate: toDateString("2026-01-31"),
        guideTokens: [validGuideToken],
      },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: true,
      data: [
        {
          id: transaction.id,
          accountId: "account-1",
          categoryId: "category-1",
          type: TransactionType.EXPENSE,
          amount: 42,
          currency: "USD",
          date: "2026-01-15",
          description: "Coffee",
          transferId: transaction.transferId,
        },
      ],
    });
  });

  // Validation failures

  it("rejects without valid basics guide token and does not call repository", async () => {
    // Act
    const result = await getTransactions(
      {
        startDate: toDateString("2026-01-01"),
        endDate: toDateString("2026-01-31"),
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
    expect(mockTransactionRepository.findManyByUserId).not.toHaveBeenCalled();
  });

  it("does not disclose valid guide token in rejection message", async () => {
    // Act
    const result = await getTransactions(
      {
        startDate: toDateString("2026-01-01"),
        endDate: toDateString("2026-01-31"),
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

  it("returns failure when startDate is after endDate", async () => {
    // Act
    const result = await getTransactions(
      {
        startDate: toDateString("2026-01-31"),
        endDate: toDateString("2026-01-01"),
        guideTokens: [validGuideToken],
      },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error: "startDate must not be after endDate",
    });
    expect(mockTransactionRepository.findManyByUserId).not.toHaveBeenCalled();
  });

  it("returns failure when date range exceeds 365 days", async () => {
    // Act
    const result = await getTransactions(
      {
        startDate: toDateString("2025-01-01"),
        endDate: toDateString("2026-01-02"),
        guideTokens: [validGuideToken],
      },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error: "Date range must not exceed 365 days",
    });
    expect(mockTransactionRepository.findManyByUserId).not.toHaveBeenCalled();
  });

  // Dependency failures

  it("propagates error when repository throws", async () => {
    // Arrange
    const errorMessage = faker.lorem.sentence();
    mockTransactionRepository.findManyByUserId.mockRejectedValue(
      new Error(errorMessage),
    );

    // Act
    const promise = getTransactions(
      {
        startDate: toDateString("2026-01-01"),
        endDate: toDateString("2026-01-31"),
        guideTokens: [validGuideToken],
      },
      deps,
    );

    // Assert
    await expect(promise).rejects.toThrow(errorMessage);
  });
});
