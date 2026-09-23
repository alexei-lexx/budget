import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { toTransactionDto } from "../../langchain/tools/transaction-dto";
import { BusinessError } from "../../services/business-error";
import { TransactionService } from "../../services/transaction-service";
import { fakeTransaction } from "../../utils/test-utils/models/transaction-fakes";
import { fakeCreateCompoundTransactionServiceInput } from "../../utils/test-utils/services/transaction-service-fakes";
import { createMockTransactionService } from "../../utils/test-utils/services/transaction-service-mocks";
import { createCompoundTransaction } from "./create-compound-transaction";
import { GUIDES } from "./guides";

describe("createCompoundTransaction", () => {
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

  it("creates compound transaction and returns its related transactions", async () => {
    // Arrange
    const legCount = 2;
    const createdTransactions = Array.from({ length: legCount }, () =>
      fakeTransaction(),
    );
    mockTransactionService.createCompoundTransaction.mockResolvedValue(
      createdTransactions,
    );

    const input = fakeCreateCompoundTransactionServiceInput({}, legCount);

    // Act
    const result = await createCompoundTransaction(
      {
        ...input,
        guideTokens: validGuideTokens,
      },
      deps,
    );

    // Assert
    expect(result).toEqual(createdTransactions.map(toTransactionDto));
    expect(
      mockTransactionService.createCompoundTransaction,
    ).toHaveBeenCalledWith(input, userId);
  });

  // Validation failures

  it("rejects without any guide tokens and does not call service", async () => {
    // Act
    const promise = createCompoundTransaction(
      {
        ...fakeCreateCompoundTransactionServiceInput(),
        guideTokens: [],
      },
      deps,
    );

    // Assert
    await expect(promise).rejects.toThrow(
      new BusinessError(
        "Missing or invalid guide token for: basics, create-transaction. Reload the guide(s) and retry",
      ),
    );
    expect(
      mockTransactionService.createCompoundTransaction,
    ).not.toHaveBeenCalled();
  });

  it("does not disclose valid guide tokens in rejection message", async () => {
    // Act
    const promise = createCompoundTransaction(
      {
        ...fakeCreateCompoundTransactionServiceInput(),
        guideTokens: [],
      },
      deps,
    );

    // Assert
    for (const validGuideToken of validGuideTokens) {
      await expect(promise).rejects.toMatchObject({
        message: expect.not.stringContaining(validGuideToken),
      });
    }
  });

  // Dependency failures

  it("propagates error when service throws", async () => {
    // Arrange
    const errorMessage = faker.lorem.sentence();
    mockTransactionService.createCompoundTransaction.mockRejectedValue(
      new Error(errorMessage),
    );

    // Act
    const promise = createCompoundTransaction(
      {
        ...fakeCreateCompoundTransactionServiceInput(),
        guideTokens: validGuideTokens,
      },
      deps,
    );

    // Assert
    await expect(promise).rejects.toThrow(errorMessage);
  });
});
