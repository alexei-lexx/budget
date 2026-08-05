import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { TransactionType } from "../../models/transaction";
import { BusinessError } from "../../services/business-error";
import {
  CreateTransactionServiceInput,
  TransactionService,
} from "../../services/transaction-service";
import { toDateString } from "../../types/date";
import { fakeTransaction } from "../../utils/test-utils/models/transaction-fakes";
import { createMockTransactionService } from "../../utils/test-utils/services/transaction-service-mocks";
import { createTransaction } from "./create-transaction";
import { GUIDES } from "./guides";

describe("createTransaction", () => {
  let mockTransactionService: Mocked<TransactionService>;
  const userId = faker.string.uuid();
  let deps: { transactionService: Mocked<TransactionService>; userId: string };

  const validGuideToken = GUIDES.basics.token;

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
      { ...input, guideTokens: [validGuideToken] },
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

  it("rejects without valid basics guide token and does not call service", async () => {
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
        "Missing or invalid guide token for: basics. Reload the guide(s) and retry",
    });
    expect(mockTransactionService.createTransaction).not.toHaveBeenCalled();
  });

  it("does not disclose valid guide token in rejection message", async () => {
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
      error: expect.not.stringContaining(validGuideToken),
    });
  });

  // Dependency failures

  it("returns failure when service throws", async () => {
    // Arrange
    mockTransactionService.createTransaction.mockRejectedValue(
      new BusinessError("Account not found"),
    );

    // Act
    const result = await createTransaction(
      {
        accountId: faker.string.uuid(),
        amount: 10,
        date: toDateString("2026-01-15"),
        type: TransactionType.EXPENSE,
        guideTokens: [validGuideToken],
      },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error: "Account not found",
    });
  });
});
