import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { TransactionType } from "../models/transaction";
import { AccountRepository } from "../ports/account-repository";
import { TransactionRepository } from "../ports/transaction-repository";
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
  let mockAccountRepository: jest.Mocked<AccountRepository>;
  let mockTransactionRepository: jest.Mocked<TransactionRepository>;
  let service: AccountService;
  let userId: string;

  beforeEach(() => {
    mockAccountRepository = createMockAccountRepository();
    mockTransactionRepository = createMockTransactionRepository();

    service = new AccountService(
      mockAccountRepository,
      mockTransactionRepository,
    );
    userId = faker.string.uuid();
  });

  describe("getAccountsByUser", () => {
    // Happy path

    it("should return accounts for a user", async () => {
      // Arrange
      const accounts = [fakeAccount(), fakeAccount()];
      mockAccountRepository.findManyByUserId.mockResolvedValue(accounts);

      // Act
      const result = await service.getAccountsByUser(userId);

      // Assert
      expect(result).toEqual(accounts);
      expect(mockAccountRepository.findManyByUserId).toHaveBeenCalledWith(
        userId,
      );
    });

    // Dependency failures

    it("should propagate repository errors", async () => {
      // Arrange

      // Repository throws on DB error
      mockAccountRepository.findManyByUserId.mockRejectedValue(
        new Error("Database error"),
      );

      // Act & Assert
      await expect(service.getAccountsByUser(userId)).rejects.toThrow(
        "Database error",
      );
    });
  });

  describe("createAccount", () => {
    // Happy path

    it("should create and return a new account", async () => {
      // Arrange
      const input = fakeCreateAccountInput({ userId });
      const createdAccount = fakeAccount();
      mockAccountRepository.findManyByUserId.mockResolvedValue([]);
      mockAccountRepository.create.mockResolvedValue(createdAccount);

      // Act
      const result = await service.createAccount(input);

      // Assert
      expect(result).toEqual(createdAccount);
      expect(mockAccountRepository.create).toHaveBeenCalledWith({
        currency: input.currency,
        initialBalance: input.initialBalance,
        name: input.name,
        userId,
      });
    });

    it("should trim the name before creating", async () => {
      // Arrange
      const input = fakeCreateAccountInput({ userId, name: "  Savings  " });
      const createdAccount = fakeAccount();
      mockAccountRepository.findManyByUserId.mockResolvedValue([]);
      mockAccountRepository.create.mockResolvedValue(createdAccount);

      // Act
      await service.createAccount(input);

      // Assert
      expect(mockAccountRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Savings" }),
      );
    });

    it("should normalize currency to uppercase before creating", async () => {
      // Arrange
      const input = fakeCreateAccountInput({ userId, currency: "usd" });
      const createdAccount = fakeAccount();
      mockAccountRepository.findManyByUserId.mockResolvedValue([]);
      mockAccountRepository.create.mockResolvedValue(createdAccount);

      // Act
      await service.createAccount(input);

      // Assert
      expect(mockAccountRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ currency: "USD" }),
      );
    });

    // Validation failures

    it("should throw when name is empty", async () => {
      // Arrange
      const input = fakeCreateAccountInput({ userId, name: "" });

      // Act & Assert
      const promise = service.createAccount(input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Account name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      });
      expect(mockAccountRepository.create).not.toHaveBeenCalled();
    });

    it("should throw when name is only whitespace", async () => {
      // Arrange
      const input = fakeCreateAccountInput({ userId, name: "   " });

      // Act & Assert
      const promise = service.createAccount(input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Account name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      });
      expect(mockAccountRepository.create).not.toHaveBeenCalled();
    });

    it("should throw when name exceeds maximum length", async () => {
      // Arrange
      const input = fakeCreateAccountInput({
        userId,
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

    it("should throw when currency is unsupported", async () => {
      // Arrange
      const input = fakeCreateAccountInput({ userId, currency: "GBP" });

      // Act & Assert
      const promise = service.createAccount(input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Unsupported currency: GBP. Supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}`,
      });
      expect(mockAccountRepository.create).not.toHaveBeenCalled();
    });

    it("should throw when account name already exists (case-insensitive)", async () => {
      // Arrange
      // Another account with the same name exists (different casing)
      mockAccountRepository.findManyByUserId.mockResolvedValue([
        fakeAccount({ name: "SAVINGS" }),
      ]);
      const input = fakeCreateAccountInput({ userId, name: "savings" });

      // Act & Assert
      const promise = service.createAccount(input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: 'Account "savings" already exists',
      });
      expect(mockAccountRepository.create).not.toHaveBeenCalled();
    });

    // Dependency failures

    it("should propagate repository errors on create", async () => {
      // Arrange
      const input = fakeCreateAccountInput({ userId });
      mockAccountRepository.findManyByUserId.mockResolvedValue([]);

      // Repository throws on DB error
      mockAccountRepository.create.mockRejectedValue(
        new Error("Database error"),
      );

      // Act & Assert
      await expect(service.createAccount(input)).rejects.toThrow(
        "Database error",
      );
    });
  });

  describe("updateAccount", () => {
    // Happy path

    it("should update and return the account", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const currentAccount = fakeAccount({ id: accountId });
      const updatedAccount = fakeAccount({ id: accountId });

      // Account exists
      mockAccountRepository.findOneById.mockResolvedValue(currentAccount);
      // No name conflicts
      mockAccountRepository.findManyByUserId.mockResolvedValue([
        currentAccount,
      ]);
      mockAccountRepository.update.mockResolvedValue(updatedAccount);

      // Act
      const result = await service.updateAccount(accountId, userId, {
        name: "New Name",
      });

      // Assert
      expect(result).toEqual(updatedAccount);
      expect(mockAccountRepository.update).toHaveBeenCalledWith(
        { id: accountId, userId },
        { name: "New Name" },
      );
    });

    it("should trim the name before updating", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const currentAccount = fakeAccount({ id: accountId });

      mockAccountRepository.findOneById.mockResolvedValue(currentAccount);
      mockAccountRepository.findManyByUserId.mockResolvedValue([
        currentAccount,
      ]);
      mockAccountRepository.update.mockResolvedValue(currentAccount);

      // Act
      await service.updateAccount(accountId, userId, { name: "  Savings  " });

      // Assert
      expect(mockAccountRepository.update).toHaveBeenCalledWith(
        { id: accountId, userId },
        { name: "Savings" },
      );
    });

    it("should normalize currency to uppercase before updating", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const currentAccount = fakeAccount({ id: accountId, currency: "USD" });

      mockAccountRepository.findOneById.mockResolvedValue(currentAccount);
      // No transactions — currency change is allowed
      mockTransactionRepository.hasTransactionsForAccount.mockResolvedValue(
        false,
      );
      mockAccountRepository.update.mockResolvedValue(currentAccount);

      // Act
      await service.updateAccount(accountId, userId, { currency: "eur" });

      // Assert
      expect(mockAccountRepository.update).toHaveBeenCalledWith(
        { id: accountId, userId },
        { currency: "EUR" },
      );
    });

    it("should allow keeping the same account name", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const currentAccount = fakeAccount({ id: accountId, name: "Savings" });

      mockAccountRepository.findOneById.mockResolvedValue(currentAccount);
      // Only the current account exists — same name is not a conflict
      mockAccountRepository.findManyByUserId.mockResolvedValue([
        currentAccount,
      ]);
      mockAccountRepository.update.mockResolvedValue(currentAccount);

      // Act
      const result = await service.updateAccount(accountId, userId, {
        name: "Savings",
      });

      // Assert
      expect(result).toEqual(currentAccount);
      expect(mockAccountRepository.update).toHaveBeenCalled();
    });

    it("should allow currency change when account has no transactions", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const currentAccount = fakeAccount({ id: accountId, currency: "USD" });
      const updatedAccount = fakeAccount({ id: accountId, currency: "EUR" });

      mockAccountRepository.findOneById.mockResolvedValue(currentAccount);
      // No transactions for this account
      mockTransactionRepository.hasTransactionsForAccount.mockResolvedValue(
        false,
      );
      mockAccountRepository.update.mockResolvedValue(updatedAccount);

      // Act
      const result = await service.updateAccount(accountId, userId, {
        currency: "EUR",
      });

      // Assert
      expect(result).toEqual(updatedAccount);
      expect(mockAccountRepository.update).toHaveBeenCalled();
    });

    // Validation failures

    it("should throw when account is not found", async () => {
      // Arrange
      const accountId = faker.string.uuid();

      // Account does not exist
      mockAccountRepository.findOneById.mockResolvedValue(null);

      // Act & Assert
      const promise = service.updateAccount(accountId, userId, {
        name: "Test",
      });

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Account not found",
      });
      expect(mockAccountRepository.update).not.toHaveBeenCalled();
    });

    it("should throw when updated name is empty", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const currentAccount = fakeAccount({ id: accountId });
      mockAccountRepository.findOneById.mockResolvedValue(currentAccount);

      // Act & Assert
      const promise = service.updateAccount(accountId, userId, { name: "" });

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Account name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      });
      expect(mockAccountRepository.update).not.toHaveBeenCalled();
    });

    it("should throw when updated name exceeds maximum length", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const currentAccount = fakeAccount({ id: accountId });
      mockAccountRepository.findOneById.mockResolvedValue(currentAccount);

      // Act & Assert
      const promise = service.updateAccount(accountId, userId, {
        name: "a".repeat(NAME_MAX_LENGTH + 1),
      });

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Account name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      });
      expect(mockAccountRepository.update).not.toHaveBeenCalled();
    });

    it("should throw when updated currency is unsupported", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const currentAccount = fakeAccount({ id: accountId });
      mockAccountRepository.findOneById.mockResolvedValue(currentAccount);

      // Act & Assert
      const promise = service.updateAccount(accountId, userId, {
        currency: "GBP",
      });

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Unsupported currency: GBP. Supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}`,
      });
      expect(mockAccountRepository.update).not.toHaveBeenCalled();
    });

    it("should throw when updated name already exists for another account", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const currentAccount = fakeAccount({ id: accountId, name: "Checking" });
      const anotherAccount = fakeAccount({ name: "Savings" });

      mockAccountRepository.findOneById.mockResolvedValue(currentAccount);
      // Another account already has the name "Savings"
      mockAccountRepository.findManyByUserId.mockResolvedValue([
        currentAccount,
        anotherAccount,
      ]);

      // Act & Assert
      const promise = service.updateAccount(accountId, userId, {
        name: "Savings",
      });

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: 'Account "Savings" already exists',
      });
      expect(mockAccountRepository.update).not.toHaveBeenCalled();
    });

    it("should throw when changing currency and account has existing transactions", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const currentAccount = fakeAccount({ id: accountId, currency: "USD" });

      mockAccountRepository.findOneById.mockResolvedValue(currentAccount);
      // Account has existing transactions — currency cannot be changed
      mockTransactionRepository.hasTransactionsForAccount.mockResolvedValue(
        true,
      );

      // Act & Assert
      const promise = service.updateAccount(accountId, userId, {
        currency: "EUR",
      });

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message:
          "Cannot change currency for account that has existing transactions. Please create a new account with the desired currency instead.",
      });
      expect(mockAccountRepository.update).not.toHaveBeenCalled();
    });

    // Dependency failures

    it("should propagate repository errors on update", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const currentAccount = fakeAccount({ id: accountId });

      mockAccountRepository.findOneById.mockResolvedValue(currentAccount);
      mockAccountRepository.findManyByUserId.mockResolvedValue([
        currentAccount,
      ]);

      // Repository throws on DB write error
      mockAccountRepository.update.mockRejectedValue(
        new Error("Database error"),
      );

      // Act & Assert
      await expect(
        service.updateAccount(accountId, userId, { name: "New Name" }),
      ).rejects.toThrow("Database error");
    });
  });

  describe("deleteAccount", () => {
    // Happy path

    it("should archive and return the account", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const archivedAccount = fakeAccount({ id: accountId, isArchived: true });
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

    // Dependency failures

    it("should propagate repository errors on archive", async () => {
      // Arrange
      const accountId = faker.string.uuid();

      // Repository throws on DB error
      mockAccountRepository.archive.mockRejectedValue(
        new Error("Database error"),
      );

      // Act & Assert
      await expect(service.deleteAccount(accountId, userId)).rejects.toThrow(
        "Database error",
      );
    });
  });

  describe("calculateBalance", () => {
    // Happy path

    it("should return initial balance when there are no transactions", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const account = fakeAccount({ id: accountId, initialBalance: 500 });

      mockAccountRepository.findOneById.mockResolvedValue(account);
      // No transactions
      mockTransactionRepository.findManyByAccountId.mockResolvedValue([]);

      // Act
      const result = await service.calculateBalance(accountId, userId);

      // Assert
      expect(result).toBe(500);
      expect(
        mockTransactionRepository.findManyByAccountId,
      ).toHaveBeenCalledWith({
        accountId,
        userId,
      });
    });

    it("should add income and subtract expenses from initial balance", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const account = fakeAccount({ id: accountId, initialBalance: 100 });

      mockAccountRepository.findOneById.mockResolvedValue(account);
      mockTransactionRepository.findManyByAccountId.mockResolvedValue([
        fakeTransaction({ type: TransactionType.INCOME, amount: 200 }),
        fakeTransaction({ type: TransactionType.EXPENSE, amount: 50 }),
      ]);

      // Act
      const result = await service.calculateBalance(accountId, userId);

      // Assert
      expect(result).toBe(250); // 100 + 200 - 50
      expect(
        mockTransactionRepository.findManyByAccountId,
      ).toHaveBeenCalledWith({
        accountId,
        userId,
      });
    });

    it("should include REFUND and TRANSFER_IN as positive, TRANSFER_OUT as negative", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const account = fakeAccount({ id: accountId, initialBalance: 0 });

      mockAccountRepository.findOneById.mockResolvedValue(account);
      mockTransactionRepository.findManyByAccountId.mockResolvedValue([
        fakeTransaction({
          type: TransactionType.REFUND,
          amount: 30,
        }),
        fakeTransaction({
          type: TransactionType.TRANSFER_IN,
          amount: 100,
        }),
        fakeTransaction({
          type: TransactionType.TRANSFER_OUT,
          amount: 40,
        }),
      ]);

      // Act
      const result = await service.calculateBalance(accountId, userId);

      // Assert
      expect(result).toBe(90); // 0 + 30 + 100 - 40
      expect(
        mockTransactionRepository.findManyByAccountId,
      ).toHaveBeenCalledWith({
        accountId,
        userId,
      });
    });

    // Validation failures

    it("should throw when account is not found", async () => {
      // Arrange
      const accountId = faker.string.uuid();

      // Account does not exist or does not belong to user
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

    // Dependency failures

    it("should propagate transaction repository errors", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const account = fakeAccount({ id: accountId });

      mockAccountRepository.findOneById.mockResolvedValue(account);

      // Repository throws on DB error
      mockTransactionRepository.findManyByAccountId.mockRejectedValue(
        new Error("Database error"),
      );

      // Act & Assert
      await expect(service.calculateBalance(accountId, userId)).rejects.toThrow(
        "Database error",
      );
    });
  });
});
