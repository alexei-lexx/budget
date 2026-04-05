import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { TransactionType } from "../models/transaction";
import {
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  SUPPORTED_CURRENCIES,
} from "../types/validation";
import { fakeAccount } from "../utils/test-utils/models/account-fakes";
import { fakeTransaction } from "../utils/test-utils/models/transaction-fakes";
import { fakeCreateAccountInput } from "../utils/test-utils/repositories/account-repository-fakes";
import { createMockAccountRepository } from "../utils/test-utils/repositories/account-repository-mocks";
import { createMockTransactionRepository } from "../utils/test-utils/repositories/transaction-repository-mocks";
import { AccountService } from "./account-service";
import { BusinessError } from "./business-error";

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

    // Default mock for duplicate name checking (can be overridden in specific tests)
    mockAccountRepository.findManyByUserId.mockResolvedValue([]);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe("getAccountsByUser", () => {
    it("should return all active accounts for a user", async () => {
      // Arrange
      const accounts = [
        fakeAccount({ userId }),
        fakeAccount({ userId }),
        fakeAccount({ userId }),
      ];
      mockAccountRepository.findManyByUserId.mockResolvedValue(accounts);

      // Act
      const result = await service.getAccountsByUser(userId);

      // Assert
      expect(result).toEqual(accounts);
      expect(mockAccountRepository.findManyByUserId).toHaveBeenCalledWith(
        userId,
      );
    });
  });

  describe("createAccount", () => {
    it("should create a new account", async () => {
      // Arrange
      const input = {
        userId,
        name: "Checking Account",
        currency: "USD",
        initialBalance: 1000,
      };
      const createdAccount = fakeAccount(input);
      mockAccountRepository.create.mockResolvedValue(createdAccount);

      // Act
      const result = await service.createAccount(input);

      // Assert
      expect(result).toEqual(createdAccount);
      expect(mockAccountRepository.create).toHaveBeenCalledWith(input);
    });

    it("should trim name", async () => {
      // Arrange
      const input = fakeCreateAccountInput({ name: "  Cash  " });

      // Act
      await service.createAccount(input);

      // Assert
      expect(mockAccountRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Cash", // Trimmed
        }),
      );
    });

    it("should throw error when name is empty string", async () => {
      // Arrange
      const input = fakeCreateAccountInput({ name: "" });

      // Act & Assert
      const promise = service.createAccount(input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Account name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      });
      expect(mockAccountRepository.create).not.toHaveBeenCalled();
    });

    it("should throw error when name is only whitespace", async () => {
      // Arrange
      const input = fakeCreateAccountInput({ name: "   " });

      // Act & Assert
      const promise = service.createAccount(input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Account name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      });
      expect(mockAccountRepository.create).not.toHaveBeenCalled();
    });

    it("should throw error when name exceeds maximum length", async () => {
      // Arrange
      const input = fakeCreateAccountInput({
        name: "a".repeat(NAME_MAX_LENGTH + 1),
      });

      // Act & Assert
      const promise = service.createAccount(input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Account name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      });
      expect(mockAccountRepository.create).not.toHaveBeenCalled();
    });

    it("should throw error when name already exists", async () => {
      // Arrange
      const input = fakeCreateAccountInput({ name: "Checking" }); // Capital "C"
      const existingAccount = fakeAccount({
        userId,
        name: "checking", // Lowercase "c", to test case insensitivity
      });
      mockAccountRepository.findManyByUserId.mockResolvedValue([
        existingAccount,
      ]);

      // Act & Assert
      const promise = service.createAccount(input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: 'Account "Checking" already exists',
      });
      expect(mockAccountRepository.create).not.toHaveBeenCalled();
    });

    it("should trim and uppercase currency", async () => {
      // Arrange
      const input = fakeCreateAccountInput({ currency: "  eur  " });

      // Act
      await service.createAccount(input);

      // Assert
      expect(mockAccountRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: "EUR", // Trimmed and uppercased
        }),
      );
    });

    it("should throw error when currency is unsupported", async () => {
      // Arrange
      const input = fakeCreateAccountInput({ currency: "XYZ" });

      // Act & Assert
      const promise = service.createAccount(input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Unsupported currency: XYZ. Supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}`,
      });
      expect(mockAccountRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("updateAccount", () => {
    it("should update an account without currency change", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const currentAccount = fakeAccount({
        id: accountId,
        userId,
        name: "Account Name",
      });
      const input = { name: "Updated Account Name" };
      const updatedAccount = { ...currentAccount, ...input };

      mockAccountRepository.findOneById.mockResolvedValue(currentAccount);
      mockAccountRepository.update.mockResolvedValue(updatedAccount);

      // Act
      const result = await service.updateAccount(accountId, userId, input);

      // Assert
      expect(result).toEqual(updatedAccount);
      expect(mockAccountRepository.findOneById).toHaveBeenCalledWith({
        id: accountId,
        userId,
      });
      expect(mockAccountRepository.update).toHaveBeenCalledWith(
        { id: accountId, userId },
        input,
      );
      expect(
        mockTransactionRepository.hasTransactionsForAccount,
      ).not.toHaveBeenCalled();
    });

    it("should trim name", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const input = { name: "  Cash  " };

      const currentAccount = fakeAccount({
        id: accountId,
        userId,
      });

      mockAccountRepository.findOneById.mockResolvedValue(currentAccount);

      // Act
      await service.updateAccount(accountId, userId, input);

      // Assert
      expect(mockAccountRepository.update).toHaveBeenCalledWith(
        { id: accountId, userId },
        { name: "Cash" }, // Trimmed
      );
    });

    it("should update account currency when no transactions exist", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const currentAccount = fakeAccount({
        id: accountId,
        userId,
        currency: "USD",
      });
      const input = { currency: "EUR" };
      const updatedAccount = { ...currentAccount, ...input };

      mockAccountRepository.findOneById.mockResolvedValue(currentAccount);
      mockTransactionRepository.hasTransactionsForAccount.mockResolvedValue(
        false,
      );
      mockAccountRepository.update.mockResolvedValue(updatedAccount);

      // Act
      const result = await service.updateAccount(accountId, userId, input);

      // Assert
      expect(result).toEqual(updatedAccount);
      expect(
        mockTransactionRepository.hasTransactionsForAccount,
      ).toHaveBeenCalledWith({ accountId, userId });
      expect(mockAccountRepository.update).toHaveBeenCalledWith(
        { id: accountId, userId },
        input,
      );
    });

    it("should throw error when changing currency and transactions exist", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const currentAccount = fakeAccount({
        id: accountId,
        userId,
        currency: "USD",
      });
      const input = { currency: "EUR" };

      mockAccountRepository.findOneById.mockResolvedValue(currentAccount);
      mockTransactionRepository.hasTransactionsForAccount.mockResolvedValue(
        true,
      );

      // Act & Assert
      const promise = service.updateAccount(accountId, userId, input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message:
          "Cannot change currency for account that has existing transactions. Please create a new account with the desired currency instead.",
      });
      expect(mockAccountRepository.update).not.toHaveBeenCalled();
    });

    it("should throw error when account not found", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      mockAccountRepository.findOneById.mockResolvedValue(null);

      // Act & Assert
      const promise = service.updateAccount(accountId, userId, {
        name: "New Name",
      });

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Account not found",
      });
      expect(mockAccountRepository.update).not.toHaveBeenCalled();
    });

    it("should throw error when name is empty string", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const input = { name: "" };
      const currentAccount = fakeAccount({ id: accountId, userId });

      mockAccountRepository.findOneById.mockResolvedValue(currentAccount);

      // Act & Assert
      const promise = service.updateAccount(accountId, userId, input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Account name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      });
      expect(mockAccountRepository.update).not.toHaveBeenCalled();
    });

    it("should throw error when name is only whitespace", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const input = { name: "   " };
      const currentAccount = fakeAccount({ id: accountId, userId });

      mockAccountRepository.findOneById.mockResolvedValue(currentAccount);

      // Act & Assert
      const promise = service.updateAccount(accountId, userId, input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Account name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      });
      expect(mockAccountRepository.update).not.toHaveBeenCalled();
    });

    it("should throw error when name exceeds maximum length", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const input = { name: "a".repeat(NAME_MAX_LENGTH + 1) };
      const currentAccount = fakeAccount({ id: accountId, userId });

      mockAccountRepository.findOneById.mockResolvedValue(currentAccount);

      // Act & Assert
      const promise = service.updateAccount(accountId, userId, input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Account name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      });
      expect(mockAccountRepository.update).not.toHaveBeenCalled();
    });

    it("should throw error when updated name already exists", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const input = { name: "Checking" }; //Capital "C"
      const currentAccount = fakeAccount({ id: accountId, userId });
      const existingAccount = fakeAccount({
        id: faker.string.uuid(),
        userId,
        name: "checking", // Lowercase "c", to test case insensitivity
      });

      mockAccountRepository.findOneById.mockResolvedValue(currentAccount);
      mockAccountRepository.findManyByUserId.mockResolvedValue([
        currentAccount,
        existingAccount,
      ]);

      // Act & Assert
      const promise = service.updateAccount(accountId, userId, input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: 'Account "Checking" already exists',
      });
      expect(mockAccountRepository.update).not.toHaveBeenCalled();
    });

    it("should allow keeping same name when updating", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const input = { name: "Checking" };
      const currentAccount = fakeAccount({
        id: accountId,
        userId,
        name: "Checking",
      });

      mockAccountRepository.findOneById.mockResolvedValue(currentAccount);
      mockAccountRepository.findManyByUserId.mockResolvedValue([
        currentAccount,
      ]);

      // Act
      await service.updateAccount(accountId, userId, input);

      // Assert
      expect(mockAccountRepository.update).toHaveBeenCalled();
    });

    it("should trim and uppercase currency", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const input = { currency: "  eur  " };
      const currentAccount = fakeAccount({
        id: accountId,
        userId,
        currency: "USD",
      });

      mockAccountRepository.findOneById.mockResolvedValue(currentAccount);
      mockTransactionRepository.hasTransactionsForAccount.mockResolvedValue(
        false,
      );

      // Act
      await service.updateAccount(accountId, userId, input);

      // Assert
      expect(mockAccountRepository.update).toHaveBeenCalledWith(
        { id: accountId, userId },
        { currency: "EUR" }, // Trimmed and uppercased
      );
    });

    it("should throw error when currency is unsupported", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const input = { currency: "XYZ" };
      const currentAccount = fakeAccount({ id: accountId, userId });

      mockAccountRepository.findOneById.mockResolvedValue(currentAccount);

      // Act & Assert
      const promise = service.updateAccount(accountId, userId, input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Unsupported currency: XYZ. Supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}`,
      });
      expect(mockAccountRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteAccount", () => {
    it("should archive an account", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const archivedAccount = fakeAccount({
        id: accountId,
        userId,
        isArchived: true,
      });
      mockAccountRepository.archive.mockResolvedValue(archivedAccount);

      // Act
      const result = await service.deleteAccount(accountId, userId);

      // Assert
      expect(result).toEqual(archivedAccount);
      expect(mockAccountRepository.archive).toHaveBeenCalledWith({
        id: accountId,
        userId,
      });
    });
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

      mockAccountRepository.findOneById.mockResolvedValue(account);
      mockTransactionRepository.findManyByAccountId.mockResolvedValue(
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
      mockAccountRepository.findOneById.mockResolvedValue(null);

      // Act & Assert
      const promise = service.calculateBalance(accountId, userId);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Account not found or doesn't belong to user",
      });

      expect(
        mockTransactionRepository.findManyByAccountId,
      ).not.toHaveBeenCalled();
    });
  });
});
