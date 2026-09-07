import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { TransactionType } from "../../models/transaction";
import { BusinessError } from "../../services/business-error";
import { TransactionService } from "../../services/transaction-service";
import { toDateString } from "../../types/date-string";
import { fakeTransaction } from "../../utils/test-utils/models/transaction-fakes";
import { createMockTransactionService } from "../../utils/test-utils/services/transaction-service-mocks";
import { createGetRecentTransactionsTool } from "./get-recent-transactions";

describe("createGetRecentTransactionsTool", () => {
  let mockTransactionService: Mocked<TransactionService>;
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockTransactionService = createMockTransactionService();
  });

  // Happy path

  it("returns tool with correct name", () => {
    // Act
    const recentTransactionsTool = createGetRecentTransactionsTool({
      transactionService: mockTransactionService,
    });

    // Assert
    expect(recentTransactionsTool.name).toBe("get_recent_transactions");
  });

  it("calls service and returns transactions", async () => {
    // Arrange
    const transactions = [
      fakeTransaction({
        id: "transaction1",
        accountId: "account1",
        categoryId: "category1",
        type: TransactionType.EXPENSE,
        amount: 50,
        currency: "USD",
        date: toDateString("2000-01-02"),
        description: "Grocery shopping",
      }),
    ];
    // Returns matching transactions
    mockTransactionService.getRecentTransactions.mockResolvedValue(
      transactions,
    );

    const recentTransactionsTool = createGetRecentTransactionsTool({
      transactionService: mockTransactionService,
    });

    // Act
    const result = await recentTransactionsTool.invoke(
      { expectedCount: 2 },
      { context: { userId } },
    );

    // Assert
    expect(result).toEqual({
      success: true,
      data: [
        {
          id: "transaction1",
          accountId: "account1",
          categoryId: "category1",
          type: TransactionType.EXPENSE,
          amount: 50,
          currency: "USD",
          date: "2000-01-02",
          description: "Grocery shopping",
          transferId: undefined,
        },
      ],
    });
    expect(mockTransactionService.getRecentTransactions).toHaveBeenCalledWith({
      userId,
      expectedCount: 2,
    });
  });

  it("forwards accountIds, categoryIds, and types", async () => {
    // Arrange
    const accountId = faker.string.uuid();
    const categoryId = faker.string.uuid();
    const types = [TransactionType.EXPENSE, TransactionType.INCOME];
    // Returns no matches; only forwarding is under test
    mockTransactionService.getRecentTransactions.mockResolvedValue([]);

    const recentTransactionsTool = createGetRecentTransactionsTool({
      transactionService: mockTransactionService,
    });

    // Act
    await recentTransactionsTool.invoke(
      {
        expectedCount: 5,
        accountIds: [accountId],
        categoryIds: [categoryId],
        types,
      },
      { context: { userId } },
    );

    // Assert
    expect(mockTransactionService.getRecentTransactions).toHaveBeenCalledWith({
      userId,
      expectedCount: 5,
      accountIds: [accountId],
      categoryIds: [categoryId],
      types,
    });
  });

  // Validation failures

  it("throws when userId in context is not valid UUID", async () => {
    // Arrange
    const recentTransactionsTool = createGetRecentTransactionsTool({
      transactionService: mockTransactionService,
    });

    // Act & Assert
    await expect(
      recentTransactionsTool.invoke(
        { expectedCount: 2 },
        { context: { userId: "not-a-uuid" } },
      ),
    ).rejects.toThrow();
  });

  // Dependency failures

  it("propagates BusinessError from service unchanged", async () => {
    // Arrange
    const error = new BusinessError("expectedCount must be a positive integer");
    // Service rejects with domain error
    mockTransactionService.getRecentTransactions.mockRejectedValue(error);

    const recentTransactionsTool = createGetRecentTransactionsTool({
      transactionService: mockTransactionService,
    });

    // Act & Assert
    await expect(
      recentTransactionsTool.invoke(
        { expectedCount: 2 },
        { context: { userId } },
      ),
    ).rejects.toBe(error);
  });
});
