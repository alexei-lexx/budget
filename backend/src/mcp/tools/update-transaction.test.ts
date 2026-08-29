import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { toTransactionDto } from "../../langchain/tools/transaction-dto";
import { TransactionType } from "../../models/transaction";
import { TransactionService } from "../../services/transaction-service";
import { toDateString } from "../../types/date-string";
import { fakeTransaction } from "../../utils/test-utils/models/transaction-fakes";
import { createMockTransactionService } from "../../utils/test-utils/services/transaction-service-mocks";
import { GUIDES } from "./guides";
import { updateTransaction } from "./update-transaction";

describe("updateTransaction", () => {
  let mockTransactionService: Mocked<TransactionService>;
  const userId = faker.string.uuid();
  let deps: { transactionService: Mocked<TransactionService>; userId: string };

  const validGuideToken = GUIDES.basics.token;

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
        guideTokens: [validGuideToken],
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
    await updateTransaction(
      { id: transactionId, amount: 20, guideTokens: [validGuideToken] },
      deps,
    );

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
      {
        id: transactionId,
        categoryId: null,
        description: null,
        guideTokens: [validGuideToken],
      },
      deps,
    );

    // Assert
    expect(mockTransactionService.updateTransaction).toHaveBeenCalledWith(
      transactionId,
      userId,
      { categoryId: null, description: null },
    );
  });

  // Validation failures

  it("rejects without valid basics guide token and does not call service", async () => {
    // Act
    const result = await updateTransaction(
      { id: faker.string.uuid(), amount: 20, guideTokens: [] },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error:
        "Missing or invalid guide token for: basics. Reload the guide(s) and retry",
    });
    expect(mockTransactionService.updateTransaction).not.toHaveBeenCalled();
  });

  it("does not disclose valid guide token in rejection message", async () => {
    // Act
    const result = await updateTransaction(
      { id: faker.string.uuid(), amount: 20, guideTokens: [] },
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
    mockTransactionService.updateTransaction.mockRejectedValue(
      new Error(errorMessage),
    );

    // Act
    const promise = updateTransaction(
      { id: faker.string.uuid(), amount: 20, guideTokens: [validGuideToken] },
      deps,
    );

    // Assert
    await expect(promise).rejects.toThrow(errorMessage);
  });
});
