import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { TransactionType } from "../models/transaction";
import { TransactionRepository } from "../ports/transaction-repository";
import { toDateString } from "../types/date";
import { fakeTransaction } from "../utils/test-utils/models/transaction-fakes";
import { createMockTransactionRepository } from "../utils/test-utils/repositories/transaction-repository-mocks";
import { getTransactions } from "./get-transactions";

describe("getTransactions", () => {
  let mockTransactionRepository: Mocked<TransactionRepository>;
  const userId = faker.string.uuid();
  let deps: {
    transactionRepository: Mocked<TransactionRepository>;
    userId: string;
  };

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

  it("returns failure when startDate is after endDate", async () => {
    // Act
    const result = await getTransactions(
      {
        startDate: toDateString("2026-01-31"),
        endDate: toDateString("2026-01-01"),
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
});
