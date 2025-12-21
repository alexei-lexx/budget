import { faker } from "@faker-js/faker";
import { fakeAccount, fakeTransaction } from "../__tests__/utils/factories";
import {
  createMockAccountRepository,
  createMockTransactionRepository,
} from "../__tests__/utils/mock-repositories";
import { TransactionType } from "../models/transaction";
import { AccountService } from "./account-service";
import { BusinessError, BusinessErrorCodes } from "./business-error";

describe("AccountService", () => {
  let service: AccountService;
  let userId: string;
  let mockAccountRepository: ReturnType<typeof createMockAccountRepository>;
  let mockTransactionRepository: ReturnType<
    typeof createMockTransactionRepository
  >;

  beforeEach(() => {
    mockAccountRepository = createMockAccountRepository();
    mockTransactionRepository = createMockTransactionRepository();

    service = new AccountService(
      mockAccountRepository,
      mockTransactionRepository,
    );
    userId = faker.string.uuid();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe("calculateBalance", () => {
    it("should calculate balance with all transaction types correctly", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const account = fakeAccount({
        id: accountId,
        userId,
        initialBalance: 5000,
      });

      const transactions = [
        fakeTransaction({
          accountId,
          userId,
          type: TransactionType.INCOME,
          amount: 1000,
        }),
        fakeTransaction({
          accountId,
          userId,
          type: TransactionType.EXPENSE,
          amount: 300,
        }),
        fakeTransaction({
          accountId,
          userId,
          type: TransactionType.TRANSFER_IN,
          amount: 200,
        }),
        fakeTransaction({
          accountId,
          userId,
          type: TransactionType.TRANSFER_OUT,
          amount: 150,
        }),
        fakeTransaction({
          accountId,
          userId,
          type: TransactionType.REFUND,
          amount: 75,
        }),
      ];

      mockAccountRepository.findActiveById.mockResolvedValue(account);
      mockTransactionRepository.findActiveByAccountId.mockResolvedValue(
        transactions,
      );

      // Act
      const balance = await service.calculateBalance(accountId, userId);

      // Assert
      // initialBalance (5000) + INCOME (1000) + TRANSFER_IN (200) + REFUND (75)
      // - EXPENSE (300) - TRANSFER_OUT (150) = 5825
      expect(balance).toBe(5825);
    });

    it("should throw error when account not found", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      mockAccountRepository.findActiveById.mockResolvedValue(null);

      // Act & Assert
      const promise = service.calculateBalance(accountId, userId);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Account not found or doesn't belong to user",
        code: BusinessErrorCodes.ACCOUNT_NOT_FOUND,
      });

      expect(
        mockTransactionRepository.findActiveByAccountId,
      ).not.toHaveBeenCalled();
    });
  });
});
