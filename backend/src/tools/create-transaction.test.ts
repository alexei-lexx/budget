import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { TransactionType } from "../models/transaction";
import { BusinessError } from "../services/business-error";
import {
  CreateTransactionServiceInput,
  TransactionService,
} from "../services/transaction-service";
import { toDateString } from "../types/date";
import { fakeTransaction } from "../utils/test-utils/models/transaction-fakes";
import { createMockTransactionService } from "../utils/test-utils/services/transaction-service-mocks";
import { handler } from "./create-transaction";

describe("createTransaction", () => {
  let mockTransactionService: Mocked<TransactionService>;
  const userId = faker.string.uuid();
  let deps: { transactionService: Mocked<TransactionService>; userId: string };

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
    const result = await handler(input, deps);

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

  // Error handling

  it("returns failure when service throws", async () => {
    // Arrange
    mockTransactionService.createTransaction.mockRejectedValue(
      new BusinessError("Account not found"),
    );

    // Act
    const result = await handler(
      {
        accountId: faker.string.uuid(),
        amount: 10,
        date: toDateString("2026-01-15"),
        type: TransactionType.EXPENSE,
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
