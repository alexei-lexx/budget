import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { TransactionType } from "../../models/transaction";
import {
  CreateTransactionServiceInput,
  TransactionService,
} from "../../services/transaction-service";
import { toDateString } from "../../types/date-string";
import { fakeTransaction } from "../../utils/test-utils/models/transaction-fakes";
import { createMockTransactionService } from "../../utils/test-utils/services/transaction-service-mocks";
import { createTransaction } from "./create-transaction";
import { GUIDES } from "./guides";

describe("createTransaction", () => {
  let mockTransactionService: Mocked<TransactionService>;
  const userId = faker.string.uuid();
  let deps: { transactionService: Mocked<TransactionService>; userId: string };

  const validGuideTokens = [
    GUIDES.basics.token,
    GUIDES["create-transaction"].token,
  ];

  beforeEach(() => {
    mockTransactionService = createMockTransactionService();
    deps = { transactionService: mockTransactionService, userId };
  });

  // Happy path

  it("creates transaction and returns created fields", async () => {
    // Arrange
    const created = fakeTransaction();
    mockTransactionService.createTransaction.mockResolvedValue(created);

    const input: CreateTransactionServiceInput = {
      accountId: faker.string.uuid(),
      amount: 123.45,
      categoryId: faker.string.uuid(),
      date: toDateString("2026-01-15"),
      description: "Some description",
      type: TransactionType.EXPENSE,
    };

    // Act
    const result = await createTransaction(
      {
        ...input,
        guideTokens: validGuideTokens,
      },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: true,
      data: {
        id: created.id,
        accountId: created.accountId,
        categoryId: created.categoryId,
        type: created.type,
        amount: created.amount,
        currency: created.currency,
        date: created.date,
        description: created.description,
      },
    });
    expect(mockTransactionService.createTransaction).toHaveBeenCalledWith(
      input,
      userId,
    );
  });

  // Validation failures

  it("rejects without any guide tokens and does not call service", async () => {
    // Act
    const result = await createTransaction(
      {
        accountId: faker.string.uuid(),
        amount: 10,
        date: toDateString("2026-01-15"),
        type: TransactionType.EXPENSE,
        guideTokens: [],
      },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error:
        "Missing or invalid guide token for: basics, create-transaction. Reload the guide(s) and retry",
    });
    expect(mockTransactionService.createTransaction).not.toHaveBeenCalled();
  });

  it("does not disclose valid guide tokens in rejection message", async () => {
    // Act
    const result = await createTransaction(
      {
        accountId: faker.string.uuid(),
        amount: 10,
        date: toDateString("2026-01-15"),
        type: TransactionType.EXPENSE,
        guideTokens: [],
      },
      deps,
    );

    // Assert
    for (const validGuideToken of validGuideTokens) {
      expect(result).toEqual({
        success: false,
        error: expect.not.stringContaining(validGuideToken),
      });
    }
  });

  // Dependency failures

  it("propagates error when service throws", async () => {
    // Arrange
    const errorMessage = faker.lorem.sentence();
    mockTransactionService.createTransaction.mockRejectedValue(
      new Error(errorMessage),
    );

    // Act
    const promise = createTransaction(
      {
        accountId: faker.string.uuid(),
        amount: 10,
        date: toDateString("2026-01-15"),
        type: TransactionType.EXPENSE,
        guideTokens: validGuideTokens,
      },
      deps,
    );

    // Assert
    await expect(promise).rejects.toThrow(errorMessage);
  });
});
