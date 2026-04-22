import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { TransactionType } from "../models/transaction";
import { AccountRepository } from "../ports/account-repository";
import { TransactionRepository } from "../ports/transaction-repository";
import { NAME_MAX_LENGTH, NAME_MIN_LENGTH } from "../types/validation";
import { fakeAccount } from "../utils/test-utils/models/account-fakes";
import { fakeTransaction } from "../utils/test-utils/models/transaction-fakes";
import { fakeCreateAccountInput } from "../utils/test-utils/repositories/account-repository-fakes";
import { createMockAccountRepository } from "../utils/test-utils/repositories/account-repository-mocks";
import { createMockTransactionRepository } from "../utils/test-utils/repositories/transaction-repository-mocks";
import { AccountServiceImpl } from "./account-service";
import { BusinessError } from "./business-error";

describe("AccountService", () => {
  let mockAccountRepository: jest.Mocked<AccountRepository>;
  let mockTransactionRepository: jest.Mocked<TransactionRepository>;
  let service: AccountServiceImpl;
  let userId: string;

  beforeEach(() => {
    mockAccountRepository = createMockAccountRepository();
    mockTransactionRepository = createMockTransactionRepository();

    service = new AccountServiceImpl(
      mockAccountRepository,
      mockTransactionRepository,
    );
    userId = faker.string.uuid();
  });

  describe("getAccountsByUser", () => {
    // Happy path

    it("returns accounts for user", async () => {
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

    it("propagates repository errors", async () => {
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

    it("creates and returns new account", async () => {
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

    it("trims name before creating", async () => {
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

    // Validation failures

    it("throws when name is empty", async () => {
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

    it("throws when name is only whitespace", async () => {
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

    it("throws when name exceeds maximum length", async () => {
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

    it("throws when currency is unsupported", async () => {
      // Arrange
      const input = fakeCreateAccountInput({ userId, currency: "INVALID" });

      // Act & Assert
      const promise = service.createAccount(input);

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Unsupported currency: INVALID",
      });
      expect(mockAccountRepository.create).not.toHaveBeenCalled();
    });

    it("throws when account name already exists (case-insensitive)", async () => {
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

    it("propagates repository errors on create", async () => {
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

    it("updates and returns account", async () => {
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

    it("trims name before updating", async () => {
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

    it("allows keeping same account name", async () => {
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

    it("allows currency change when account has no transactions", async () => {
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

    it("throws when account is not found", async () => {
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

    it("throws when updated name is empty", async () => {
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

    it("throws when updated name exceeds maximum length", async () => {
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

    it("throws when updated currency is unsupported", async () => {
      // Arrange
      const accountId = faker.string.uuid();
      const currentAccount = fakeAccount({ id: accountId });
      mockAccountRepository.findOneById.mockResolvedValue(currentAccount);

      // Act & Assert
      const promise = service.updateAccount(accountId, userId, {
        currency: "INVALID",
      });

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Unsupported currency: INVALID",
      });
      expect(mockAccountRepository.update).not.toHaveBeenCalled();
    });

    it("throws when updated name already exists for another account", async () => {
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

    it("throws when changing currency and account has existing transactions", async () => {
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

    it("propagates repository errors on update", async () => {
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

    it("archives and returns account", async () => {
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

    it("propagates repository errors on archive", async () => {
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

    it("returns initial balance when there are no transactions", async () => {
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

    it("adds income and subtracts expenses from initial balance", async () => {
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

    it("includes REFUND and TRANSFER_IN as positive, TRANSFER_OUT as negative", async () => {
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

    it("throws when account is not found", async () => {
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

    it("propagates transaction repository errors", async () => {
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
