import { faker } from "@faker-js/faker";
import { Failure, Success } from "ts-result";
import {
  type Mocked,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { toTransactionDto } from "../../langchain/tools/transaction-dto";
import { TransactionService } from "../../services/transaction-service";
import { toDateTimeString } from "../../types/date-time-string";
import { fakeTransaction } from "../../utils/test-utils/models/transaction-fakes";
import { createMockTransactionService } from "../../utils/test-utils/services/transaction-service-mocks";
import { deleteTransaction } from "./delete-transaction";
import { GUIDES } from "./guides";

describe("deleteTransaction", () => {
  const userId = faker.string.uuid();
  let mockTransactionService: Mocked<TransactionService>;
  let deps: { transactionService: Mocked<TransactionService>; userId: string };
  let validGuideToken: string;

  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:00:00.000Z"));

    // Guide tokens rotate hourly, so read token after freezing clock
    validGuideToken = GUIDES.basics.token;
    mockTransactionService = createMockTransactionService();
    deps = { transactionService: mockTransactionService, userId };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Happy path

  it("deletes transaction created within last hour and returns it", async () => {
    // Arrange
    const transaction = fakeTransaction({
      createdAt: toDateTimeString("2000-01-02T09:30:00.000Z"),
    });
    // Finds user's transaction
    mockTransactionService.getTransactionById.mockResolvedValue(
      Success(transaction),
    );
    // Archives and returns transaction
    const archived = transaction.archive();
    mockTransactionService.deleteTransaction.mockResolvedValue(
      Success(archived),
    );

    // Act
    const result = await deleteTransaction(
      { id: transaction.id, guideTokens: [validGuideToken] },
      deps,
    );

    // Assert
    expect(result).toBeSuccess(toTransactionDto(archived));

    expect(mockTransactionService.getTransactionById).toHaveBeenCalledWith(
      transaction.id,
      userId,
    );

    expect(mockTransactionService.deleteTransaction).toHaveBeenCalledWith(
      transaction.id,
      userId,
    );
  });

  // Validation failures

  it("fails without valid basics guide token and does not call service", async () => {
    // Act
    const result = await deleteTransaction(
      { id: faker.string.uuid(), guideTokens: [] },
      deps,
    );

    // Assert
    expect(result).toBeFailure(
      "Missing or invalid guide token for: basics. Reload the guide(s) and retry",
    );
    expect(mockTransactionService.getTransactionById).not.toHaveBeenCalled();
    expect(mockTransactionService.deleteTransaction).not.toHaveBeenCalled();
  });

  it("fails when transaction is not found", async () => {
    // Arrange
    // Transaction does not exist or belongs to another user
    mockTransactionService.getTransactionById.mockResolvedValue(
      Failure("Transaction not found or doesn't belong to user"),
    );

    // Act
    const result = await deleteTransaction(
      { id: faker.string.uuid(), guideTokens: [validGuideToken] },
      deps,
    );

    // Assert
    expect(result).toBeFailure(
      "Transaction not found or doesn't belong to user",
    );
    expect(mockTransactionService.deleteTransaction).not.toHaveBeenCalled();
  });

  it("fails when transaction was created more than one hour ago", async () => {
    // Arrange
    const transaction = fakeTransaction({
      createdAt: toDateTimeString("2000-01-02T08:00:00.000Z"),
    });
    // Finds user's old transaction
    mockTransactionService.getTransactionById.mockResolvedValue(
      Success(transaction),
    );

    // Act
    const result = await deleteTransaction(
      { id: transaction.id, guideTokens: [validGuideToken] },
      deps,
    );

    // Assert
    expect(result).toBeFailure(
      "Only transactions created within the last 1 hour can be deleted by an agent. Delete older transactions in the app.",
    );
    expect(mockTransactionService.deleteTransaction).not.toHaveBeenCalled();
  });

  // Dependency failures

  it("fails when service rejects deletion", async () => {
    // Arrange
    const transaction = fakeTransaction();
    // Finds user's transaction
    mockTransactionService.getTransactionById.mockResolvedValue(
      Success(transaction),
    );
    // Rejects deletion due to some service error
    mockTransactionService.deleteTransaction.mockResolvedValue(
      Failure("Something went wrong"),
    );

    // Act
    const result = await deleteTransaction(
      { id: transaction.id, guideTokens: [validGuideToken] },
      deps,
    );

    // Assert
    expect(result).toBeFailure("Something went wrong");
  });
});
