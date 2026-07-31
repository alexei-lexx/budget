import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { toTransactionDto } from "../../langchain/tools/transaction-dto";
import { TransactionType } from "../../models/transaction";
import { BusinessError } from "../../services/business-error";
import { TransactionService } from "../../services/transaction-service";
import { toDateString } from "../../types/date";
import { fakeTransaction } from "../../utils/test-utils/models/transaction-fakes";
import { createMockTransactionService } from "../../utils/test-utils/services/transaction-service-mocks";
import { updateTransaction } from "./update-transaction";

describe("updateTransaction", () => {
  let mockTransactionService: Mocked<TransactionService>;
  const userId = faker.string.uuid();
  let deps: { transactionService: Mocked<TransactionService>; userId: string };

  beforeEach(() => {
    mockTransactionService = createMockTransactionService();
    deps = { transactionService: mockTransactionService, userId };
  });

  // Happy path

  it("updates transaction and returns updated fields", async () => {
    // Arrange
    const updated = fakeTransaction();
    mockTransactionService.updateTransaction.mockResolvedValue(updated);

    // Act
    const result = await updateTransaction(
      {
        id: "transaction-id-123",
        accountId: "account-id-456",
        amount: 12.34,
        categoryId: "category-id-789",
        date: "2000-01-02",
        description: "Updated description",
        type: TransactionType.EXPENSE,
      },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: true,
      data: toTransactionDto(updated),
    });
    expect(mockTransactionService.updateTransaction).toHaveBeenCalledWith(
      "transaction-id-123",
      userId,
      {
        accountId: "account-id-456",
        amount: 12.34,
        categoryId: "category-id-789",
        date: toDateString("2000-01-02"),
        description: "Updated description",
        type: TransactionType.EXPENSE,
      },
    );
  });

  it("passes only supplied fields to service", async () => {
    // Arrange
    const transactionId = faker.string.uuid();
    mockTransactionService.updateTransaction.mockResolvedValue(
      fakeTransaction(),
    );

    // Act
    await updateTransaction({ id: transactionId, amount: 20 }, deps);

    // Assert
    expect(mockTransactionService.updateTransaction).toHaveBeenCalledWith(
      transactionId,
      userId,
      { amount: 20 },
    );
  });

  it("passes explicit null through for categoryId and description to clear them", async () => {
    // Arrange
    const transactionId = faker.string.uuid();
    mockTransactionService.updateTransaction.mockResolvedValue(
      fakeTransaction(),
    );

    // Act
    await updateTransaction(
      { id: transactionId, categoryId: null, description: null },
      deps,
    );

    // Assert
    expect(mockTransactionService.updateTransaction).toHaveBeenCalledWith(
      transactionId,
      userId,
      { categoryId: null, description: null },
    );
  });

  // Dependency failures

  it("returns failure when service throws", async () => {
    // Arrange
    mockTransactionService.updateTransaction.mockRejectedValue(
      new BusinessError("Transaction not found or doesn't belong to user"),
    );

    // Act
    const result = await updateTransaction(
      { id: faker.string.uuid(), amount: 20 },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error: "Transaction not found or doesn't belong to user",
    });
  });
});
