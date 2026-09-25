import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it, vi } from "vitest";
import { ModelError } from "../models/model-error";
import { TransactionType } from "../models/transaction";
import { AccountRepository } from "../ports/account-repository";
import { AtomicWriter } from "../ports/atomic-writer";
import { TransactionRepository } from "../ports/transaction-repository";
import { toDateString } from "../types/date-string";
import { fakeAccount } from "../utils/test-utils/models/account-fakes";
import {
  fakeTransferIn,
  fakeTransferOut,
} from "../utils/test-utils/models/transaction-fakes";
import { createMockAccountRepository } from "../utils/test-utils/repositories/account-repository-mocks";
import { createMockAtomicWriter } from "../utils/test-utils/repositories/atomic-writer-mocks";
import { createMockTransactionRepository } from "../utils/test-utils/repositories/transaction-repository-mocks";
import { TransferService } from "./transfer-service";

describe("TransferService", () => {
  let service: TransferService;
  let userId: string;
  let mockTransactionRepository: Mocked<TransactionRepository>;
  let mockAccountRepository: Mocked<AccountRepository>;
  let mockAtomicWriter: Mocked<AtomicWriter>;

  beforeEach(() => {
    mockAccountRepository = createMockAccountRepository();
    mockTransactionRepository = createMockTransactionRepository();
    mockAtomicWriter = createMockAtomicWriter();

    service = new TransferService({
      accountRepository: mockAccountRepository,
      transactionRepository: mockTransactionRepository,
      atomicWriter: mockAtomicWriter,
    });

    userId = faker.string.uuid();
  });

  describe("getTransfer", () => {
    // Happy path

    it("returns transfer result with outbound and inbound transactions", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      const outboundTransaction = fakeTransferOut({
        transferId,
      });
      const inboundTransaction = fakeTransferIn({
        transferId,
      });
      // Returns existing pair
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        outboundTransaction,
        inboundTransaction,
      ]);

      // Act
      const result = await service.getTransfer(transferId, userId);

      // Assert
      expect(result).toEqualSuccess({
        transferId,
        outboundTransaction,
        inboundTransaction,
      });
      expect(
        mockTransactionRepository.findManyByTransferId,
      ).toHaveBeenCalledWith({ transferId, userId });
    });

    it("identifies outbound and inbound regardless of array order", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      const outboundTransaction = fakeTransferOut({
        transferId,
      });
      const inboundTransaction = fakeTransferIn({
        transferId,
      });
      // Returns pair with inbound first
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        inboundTransaction,
        outboundTransaction,
      ]);

      // Act
      const result = await service.getTransfer(transferId, userId);

      // Assert
      expect(result).toEqualSuccess({
        transferId,
        outboundTransaction,
        inboundTransaction,
      });
    });

    it("returns undefined when transfer not found", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      // Returns no transactions
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([]);

      // Act
      const result = await service.getTransfer(transferId, userId);

      // Assert
      expect(result).toEqualSuccess(undefined);
    });

    // Validation failures

    it("fails when only one transaction found", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      // Returns single transaction
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        fakeTransferOut({ transferId }),
      ]);

      // Act
      const result = await service.getTransfer(transferId, userId);

      // Assert
      expect(result).toEqualFailure(
        "Invalid transfer state: expected 2 transactions, found 1",
      );
    });

    it("fails when more than two transactions found", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      // Returns three transactions
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        fakeTransferOut({ transferId }),
        fakeTransferIn({ transferId }),
        fakeTransferOut({ transferId }),
      ]);

      // Act
      const result = await service.getTransfer(transferId, userId);

      // Assert
      expect(result).toEqualFailure(
        "Invalid transfer state: expected 2 transactions, found 3",
      );
    });

    it("fails when TRANSFER_OUT transaction is missing", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      // Returns two inbound transactions
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        fakeTransferIn({ transferId }),
        fakeTransferIn({ transferId }),
      ]);

      // Act
      const result = await service.getTransfer(transferId, userId);

      // Assert
      expect(result).toEqualFailure(
        "Invalid transfer state: missing TRANSFER_OUT transaction",
      );
    });

    it("fails when TRANSFER_IN transaction is missing", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      // Returns two outbound transactions
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        fakeTransferOut({ transferId }),
        fakeTransferOut({ transferId }),
      ]);

      // Act
      const result = await service.getTransfer(transferId, userId);

      // Assert
      expect(result).toEqualFailure(
        "Invalid transfer state: missing TRANSFER_IN transaction",
      );
    });
  });

  describe("createTransfer", () => {
    // Happy path

    it("creates transfer pair and returns result", async () => {
      // Arrange
      const sourceAccount = fakeAccount({ userId, currency: "USD" });
      const destAccount = fakeAccount({ userId, currency: "USD" });
      // Returns from and to accounts owned by user
      mockAccountRepository.findOneById
        .mockResolvedValueOnce(sourceAccount)
        .mockResolvedValueOnce(destAccount);
      // Persists transfer pair atomically
      mockAtomicWriter.commit.mockResolvedValue({
        createdTransactions: [],
        updatedTransactions: [],
        updatedAccounts: [],
      });

      // Act
      const result = await service.createTransfer(
        {
          fromAccountId: sourceAccount.id,
          toAccountId: destAccount.id,
          amount: 100,
          date: toDateString("2024-01-01"),
          description: "Rent transfer",
        },
        userId,
      );

      // Assert
      expect(result).toEqualSuccess();
      if (!result.success) throw new Error("Expected success"); // Type guard

      expect(result.data.transferId).toEqual(expect.any(String));
      expect(result.data.outboundTransaction).toMatchObject({
        userId,
        accountId: sourceAccount.id,
        type: TransactionType.TRANSFER_OUT,
        amount: 100,
        currency: "USD",
        date: toDateString("2024-01-01"),
        description: "Rent transfer",
        transferId: result.data.transferId,
      });
      expect(result.data.inboundTransaction).toMatchObject({
        userId,
        accountId: destAccount.id,
        type: TransactionType.TRANSFER_IN,
        amount: 100,
        currency: "USD",
        date: toDateString("2024-01-01"),
        description: "Rent transfer",
        transferId: result.data.transferId,
      });

      expect(mockAtomicWriter.commit).toHaveBeenCalledTimes(1);
      const commitInput = mockAtomicWriter.commit.mock.calls[0]?.[0];
      expect(commitInput?.transactionsToCreate).toEqual([
        result.data.outboundTransaction,
        result.data.inboundTransaction,
      ]);
    });

    it("decreases from-account balance and increases to-account balance", async () => {
      // Arrange
      const sourceAccount = fakeAccount({
        userId,
        currency: "USD",
        transactionBalance: 500,
      });
      const destAccount = fakeAccount({
        userId,
        currency: "USD",
        transactionBalance: 100,
      });
      // Returns accounts owned by user
      mockAccountRepository.findOneById
        .mockResolvedValueOnce(sourceAccount)
        .mockResolvedValueOnce(destAccount);
      // Persists transfer pair atomically
      mockAtomicWriter.commit.mockResolvedValue({
        createdTransactions: [],
        updatedTransactions: [],
        updatedAccounts: [],
      });

      // Act
      await service.createTransfer(
        {
          fromAccountId: sourceAccount.id,
          toAccountId: destAccount.id,
          amount: 75,
          date: toDateString("2024-01-01"),
        },
        userId,
      );

      // Assert
      const commitInput = mockAtomicWriter.commit.mock.calls[0]?.[0];
      expect(commitInput?.accountsToUpdate).toHaveLength(2);
      expect(
        commitInput?.accountsToUpdate?.find((a) => a.id === sourceAccount.id)
          ?.transactionBalance,
      ).toBe(425);
      expect(
        commitInput?.accountsToUpdate?.find((a) => a.id === destAccount.id)
          ?.transactionBalance,
      ).toBe(175);
    });

    // Validation failures

    it("fails when source account equals destination account", async () => {
      // Arrange
      const accountId = faker.string.uuid();

      // Act
      const result = await service.createTransfer(
        {
          fromAccountId: accountId,
          toAccountId: accountId,
          amount: 100,
          date: toDateString("2024-01-01"),
        },
        userId,
      );

      // Assert
      expect(result).toEqualFailure(
        "Cannot transfer money to the same account",
      );
      expect(mockAccountRepository.findOneById).not.toHaveBeenCalled();
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    it("fails when source account not found", async () => {
      // Arrange
      // Returns no source account
      mockAccountRepository.findOneById.mockResolvedValueOnce(null);

      // Act
      const result = await service.createTransfer(
        {
          fromAccountId: faker.string.uuid(),
          toAccountId: faker.string.uuid(),
          amount: 100,
          date: toDateString("2024-01-01"),
        },
        userId,
      );

      // Assert
      expect(result).toEqualFailure(
        "Account not found or doesn't belong to user",
      );
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    it("fails when destination account not found", async () => {
      // Arrange
      const sourceAccount = fakeAccount({ userId });
      // Returns source account, then no destination account
      mockAccountRepository.findOneById
        .mockResolvedValueOnce(sourceAccount)
        .mockResolvedValueOnce(null);

      // Act
      const result = await service.createTransfer(
        {
          fromAccountId: sourceAccount.id,
          toAccountId: faker.string.uuid(),
          amount: 100,
          date: toDateString("2024-01-01"),
        },
        userId,
      );

      // Assert
      expect(result).toEqualFailure(
        "Account not found or doesn't belong to user",
      );
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    it("fails when accounts have different currencies", async () => {
      // Arrange
      const sourceAccount = fakeAccount({ userId, currency: "USD" });
      const destinationAccount = fakeAccount({ userId, currency: "EUR" });
      // Returns accounts with mismatched currencies
      mockAccountRepository.findOneById
        .mockResolvedValueOnce(sourceAccount)
        .mockResolvedValueOnce(destinationAccount);

      // Act
      const result = await service.createTransfer(
        {
          fromAccountId: sourceAccount.id,
          toAccountId: destinationAccount.id,
          amount: 100,
          date: toDateString("2024-01-01"),
        },
        userId,
      );

      // Assert
      expect(result).toEqualFailure(
        "Cannot transfer between accounts with different currencies. Source account uses USD, destination account uses EUR",
      );
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    it("propagates ModelError when amount is invalid", async () => {
      // Arrange
      const sourceAccount = fakeAccount({ userId, currency: "USD" });
      const destAccount = fakeAccount({ userId, currency: "USD" });
      // Returns accounts owned by user
      mockAccountRepository.findOneById
        .mockResolvedValueOnce(sourceAccount)
        .mockResolvedValueOnce(destAccount);

      // Act & Assert
      await expect(
        service.createTransfer(
          {
            fromAccountId: sourceAccount.id,
            toAccountId: destAccount.id,
            amount: -1,
            date: toDateString("2024-01-01"),
          },
          userId,
        ),
      ).rejects.toThrow(new ModelError("Amount must be positive"));
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    // Dependency failures

    it("fails when atomic commit rejects", async () => {
      // Arrange
      const sourceAccount = fakeAccount({ userId, currency: "USD" });
      const destAccount = fakeAccount({ userId, currency: "USD" });
      // Returns accounts owned by user
      mockAccountRepository.findOneById
        .mockResolvedValueOnce(sourceAccount)
        .mockResolvedValueOnce(destAccount);
      // Rejects with unexpected error
      mockAtomicWriter.commit.mockRejectedValue(new Error("DB down"));

      // Act
      const result = await service.createTransfer(
        {
          fromAccountId: sourceAccount.id,
          toAccountId: destAccount.id,
          amount: 100,
          date: toDateString("2024-01-01"),
        },
        userId,
      );

      // Assert
      expect(result).toEqualFailure("Failed to create transfer transactions");
    });
  });

  describe("deleteTransfer", () => {
    // Happy path

    it("archives both transactions and reverts balances", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      const sourceAccount = fakeAccount({
        userId,
        currency: "USD",
        transactionBalance: 200,
      });
      const destAccount = fakeAccount({
        userId,
        currency: "USD",
        transactionBalance: 300,
      });
      const outboundTransaction = fakeTransferOut({
        userId,
        accountId: sourceAccount.id,
        amount: 50,
        transferId,
      });
      const inboundTransaction = fakeTransferIn({
        userId,
        accountId: destAccount.id,
        amount: 50,
        transferId,
      });
      // Returns existing pair
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        outboundTransaction,
        inboundTransaction,
      ]);
      // Returns accounts including archived
      mockAccountRepository.findOneWithArchivedById
        .mockResolvedValueOnce(sourceAccount)
        .mockResolvedValueOnce(destAccount);
      // Persists archive atomically
      mockAtomicWriter.commit.mockResolvedValue({
        createdTransactions: [],
        updatedTransactions: [],
        updatedAccounts: [],
      });

      // Act
      const result = await service.deleteTransfer(transferId, userId);

      // Assert
      expect(result).toEqualSuccess();
      const commitInput = mockAtomicWriter.commit.mock.calls[0]?.[0];
      expect(commitInput?.transactionsToUpdate).toEqual([
        expect.objectContaining({
          id: outboundTransaction.id,
          isArchived: true,
        }),
        expect.objectContaining({
          id: inboundTransaction.id,
          isArchived: true,
        }),
      ]);

      // Source: 200 - (-50) = 250 (revert outbound)
      const sourceAccountToUpdate = commitInput?.accountsToUpdate?.find(
        (account) => account.id === sourceAccount.id,
      );
      expect(sourceAccountToUpdate?.transactionBalance).toBe(250);

      // Destination: 300 - 50 = 250 (revert inbound)
      const destAccountToUpdate = commitInput?.accountsToUpdate?.find(
        (account) => account.id === destAccount.id,
      );
      expect(destAccountToUpdate?.transactionBalance).toBe(250);
    });

    // Validation failures

    it("fails when transfer not found", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      // Returns no transactions
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([]);

      // Act
      const result = await service.deleteTransfer(transferId, userId);

      // Assert
      expect(result).toEqualFailure(
        "Transfer not found or doesn't belong to user",
      );
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    it("fails when pair is missing TRANSFER_IN", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      // Returns two outbound transactions
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        fakeTransferOut({ transferId }),
        fakeTransferOut({ transferId }),
      ]);

      // Act
      const result = await service.deleteTransfer(transferId, userId);

      // Assert
      expect(result).toEqualFailure("Invalid transfer state: missing pair");
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    it("fails when source account not found", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      const outboundTransaction = fakeTransferOut({
        userId,
        transferId,
      });
      const inboundTransaction = fakeTransferIn({
        userId,
        transferId,
      });
      // Returns existing pair
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        outboundTransaction,
        inboundTransaction,
      ]);
      // Returns no source account
      mockAccountRepository.findOneWithArchivedById
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(fakeAccount({ userId }));

      // Act
      const result = await service.deleteTransfer(transferId, userId);

      // Assert
      expect(result).toEqualFailure("Account not found");
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    it("fails when destination account not found", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      const outboundTransaction = fakeTransferOut({
        userId,
        transferId,
      });
      const inboundTransaction = fakeTransferIn({
        userId,
        transferId,
      });
      // Returns existing pair
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        outboundTransaction,
        inboundTransaction,
      ]);
      // Returns source account, then no destination account
      mockAccountRepository.findOneWithArchivedById
        .mockResolvedValueOnce(fakeAccount({ userId }))
        .mockResolvedValueOnce(null);

      // Act
      const result = await service.deleteTransfer(transferId, userId);

      // Assert
      expect(result).toEqualFailure("Account not found");
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    // Dependency failures

    it("fails when atomic commit rejects", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      const sourceAccount = fakeAccount({ userId, currency: "USD" });
      const destAccount = fakeAccount({ userId, currency: "USD" });
      const outboundTransaction = fakeTransferOut({
        userId,
        accountId: sourceAccount.id,
        transferId,
      });
      const inboundTransaction = fakeTransferIn({
        userId,
        accountId: destAccount.id,
        transferId,
      });
      // Returns existing pair
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        outboundTransaction,
        inboundTransaction,
      ]);
      // Returns accounts including archived
      mockAccountRepository.findOneWithArchivedById
        .mockResolvedValueOnce(sourceAccount)
        .mockResolvedValueOnce(destAccount);
      // Rejects with unexpected error
      mockAtomicWriter.commit.mockRejectedValue(new Error("DB down"));
      // Suppress error log noise
      vi.spyOn(console, "error").mockImplementation(vi.fn());

      // Act
      const result = await service.deleteTransfer(transferId, userId);

      // Assert
      expect(result).toEqualFailure("Failed to delete transfer transactions");
    });
  });

  describe("updateTransfer", () => {
    // Happy path

    it("updates transfer amount and returns bumped transactions", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      const sourceAccount = fakeAccount({
        userId,
        currency: "USD",
        transactionBalance: 500,
      });
      const destAccount = fakeAccount({
        userId,
        currency: "USD",
        transactionBalance: 200,
      });
      const outboundTransaction = fakeTransferOut({
        userId,
        accountId: sourceAccount.id,
        currency: "USD",
        amount: 100,
        transferId,
        version: 5,
      });
      const inboundTransaction = fakeTransferIn({
        userId,
        accountId: destAccount.id,
        currency: "USD",
        amount: 100,
        transferId,
        version: 5,
      });
      // Returns existing pair
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        outboundTransaction,
        inboundTransaction,
      ]);
      // Returns accounts including archived
      mockAccountRepository.findOneWithArchivedById
        .mockResolvedValueOnce(sourceAccount)
        .mockResolvedValueOnce(destAccount);
      // Persists update atomically
      mockAtomicWriter.commit.mockResolvedValue({
        createdTransactions: [],
        updatedTransactions: [],
        updatedAccounts: [],
      });

      // Act
      const result = await service.updateTransfer(transferId, userId, {
        amount: 250,
      });

      // Assert
      if (!result.success) throw new Error("Expected success"); // Type guard

      expect(result.data.transferId).toBe(transferId);
      expect(result.data.outboundTransaction).toMatchObject({
        id: outboundTransaction.id,
        amount: 250,
        version: 6,
      });
      expect(result.data.inboundTransaction).toMatchObject({
        id: inboundTransaction.id,
        amount: 250,
        version: 6,
      });

      const commitInput = mockAtomicWriter.commit.mock.calls[0]?.[0];
      expect(commitInput?.transactionsToUpdate).toEqual([
        expect.objectContaining({ id: outboundTransaction.id, amount: 250 }),
        expect.objectContaining({ id: inboundTransaction.id, amount: 250 }),
      ]);
    });

    it("updates account balances when amount changes", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      const sourceAccount = fakeAccount({
        userId,
        currency: "USD",
        transactionBalance: 500,
      });
      const destAccount = fakeAccount({
        userId,
        currency: "USD",
        transactionBalance: 200,
      });
      const outboundTransaction = fakeTransferOut({
        userId,
        accountId: sourceAccount.id,
        currency: "USD",
        amount: 100,
        transferId,
      });
      const inboundTransaction = fakeTransferIn({
        userId,
        accountId: destAccount.id,
        currency: "USD",
        amount: 100,
        transferId,
      });
      // Returns existing pair
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        outboundTransaction,
        inboundTransaction,
      ]);
      // Returns accounts including archived
      mockAccountRepository.findOneWithArchivedById
        .mockResolvedValueOnce(sourceAccount)
        .mockResolvedValueOnce(destAccount);
      // Persists update atomically
      mockAtomicWriter.commit.mockResolvedValue({
        createdTransactions: [],
        updatedTransactions: [],
        updatedAccounts: [],
      });

      // Act
      const result = await service.updateTransfer(transferId, userId, {
        amount: 150,
      });

      // Assert
      expect(result).toEqualSuccess();
      const commitInput = mockAtomicWriter.commit.mock.calls[0]?.[0];

      // Source: 500 - (-100) revert + (-150) apply = 450
      const sourceAccountToUpdate = commitInput?.accountsToUpdate?.[0];
      expect(sourceAccountToUpdate?.transactionBalance).toBe(450);

      // Destination: 200 - 100 revert + 150 apply = 250
      const destAccountToUpdate = commitInput?.accountsToUpdate?.[1];
      expect(destAccountToUpdate?.transactionBalance).toBe(250);
    });

    it("moves balance when both accounts change", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      const currency = "USD";
      const oldSourceAccount = fakeAccount({
        userId,
        currency,
        transactionBalance: 500,
      });
      const oldDestAccount = fakeAccount({
        userId,
        currency,
        transactionBalance: 300,
      });
      const newSourceAccount = fakeAccount({
        userId,
        currency,
        transactionBalance: 1000,
      });
      const newDestAccount = fakeAccount({
        userId,
        currency,
        transactionBalance: 0,
      });
      const outboundTransaction = fakeTransferOut({
        userId,
        accountId: oldSourceAccount.id,
        currency: "USD",
        amount: 100,
        transferId,
      });
      const inboundTransaction = fakeTransferIn({
        userId,
        accountId: oldDestAccount.id,
        currency: "USD",
        amount: 100,
        transferId,
      });
      // Returns existing pair
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        outboundTransaction,
        inboundTransaction,
      ]);
      // Returns old accounts including archived
      mockAccountRepository.findOneWithArchivedById
        .mockResolvedValueOnce(oldSourceAccount)
        .mockResolvedValueOnce(oldDestAccount);
      // Returns new active accounts
      mockAccountRepository.findOneById
        .mockResolvedValueOnce(newSourceAccount)
        .mockResolvedValueOnce(newDestAccount);
      // Persists update atomically
      mockAtomicWriter.commit.mockResolvedValue({
        createdTransactions: [],
        updatedTransactions: [],
        updatedAccounts: [],
      });

      // Act
      const result = await service.updateTransfer(transferId, userId, {
        fromAccountId: newSourceAccount.id,
        toAccountId: newDestAccount.id,
      });

      // Assert
      expect(result).toEqualSuccess();
      const commitInput = mockAtomicWriter.commit.mock.calls[0]?.[0];
      expect(commitInput?.accountsToUpdate).toHaveLength(4);

      // Old source: 500 - (-100) = 600 (revert outbound)
      const oldSourceAccountToUpdate = commitInput?.accountsToUpdate?.[0];
      expect(oldSourceAccountToUpdate?.transactionBalance).toBe(600);

      // New source: 1000 + (-100) = 900 (apply outbound)
      const newSourceAccountToUpdate = commitInput?.accountsToUpdate?.[1];
      expect(newSourceAccountToUpdate?.transactionBalance).toBe(900);

      // Old destination: 300 - 100 = 200 (revert inbound)
      const oldDestAccountToUpdate = commitInput?.accountsToUpdate?.[2];
      expect(oldDestAccountToUpdate?.transactionBalance).toBe(200);

      // New destination: 0 + 100 = 100 (apply inbound)
      const newDestAccountToUpdate = commitInput?.accountsToUpdate?.[3];
      expect(newDestAccountToUpdate?.transactionBalance).toBe(100);
    });

    it("recomputes balances when source and destination accounts are swapped", async () => {
      // Arrange
      // Original transfer was A -> B with amount 100; user flips it to B -> A.
      const transferId = faker.string.uuid();
      const accountA = fakeAccount({
        userId,
        currency: "USD",
        transactionBalance: 400,
      });
      const accountB = fakeAccount({
        userId,
        currency: "USD",
        transactionBalance: 300,
      });
      const outboundTransaction = fakeTransferOut({
        userId,
        accountId: accountA.id,
        currency: "USD",
        amount: 100,
        transferId,
      });
      const inboundTransaction = fakeTransferIn({
        userId,
        accountId: accountB.id,
        currency: "USD",
        amount: 100,
        transferId,
      });
      // Returns existing pair
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        outboundTransaction,
        inboundTransaction,
      ]);
      // Returns accounts including archived
      mockAccountRepository.findOneWithArchivedById
        .mockResolvedValueOnce(accountA)
        .mockResolvedValueOnce(accountB);
      // Retuns new accounts for both ids since they are swapped
      mockAccountRepository.findOneById
        .mockResolvedValueOnce(accountB)
        .mockResolvedValueOnce(accountA);
      // Persists update atomically
      mockAtomicWriter.commit.mockResolvedValue({
        createdTransactions: [],
        updatedTransactions: [],
        updatedAccounts: [],
      });

      // Act
      const result = await service.updateTransfer(transferId, userId, {
        fromAccountId: accountB.id,
        toAccountId: accountA.id,
      });

      // Assert
      expect(result).toEqualSuccess();
      const commitInput = mockAtomicWriter.commit.mock.calls[0]?.[0];
      expect(commitInput?.accountsToUpdate).toHaveLength(2);

      // A: revert outbound (-(-100) → +100) then apply inbound (+100) → 400 + 200 = 600
      const accountAToUpdate = commitInput?.accountsToUpdate?.[0];
      expect(accountAToUpdate?.transactionBalance).toBe(600);

      // B: revert inbound (-100) then apply outbound (-100) → 300 - 200 = 100
      const accountBToUpdate = commitInput?.accountsToUpdate?.[1];
      expect(accountBToUpdate?.transactionBalance).toBe(100);
    });

    it("skips account updates when only description changes", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      const sourceAccount = fakeAccount({ userId, currency: "USD" });
      const destAccount = fakeAccount({ userId, currency: "USD" });
      const outboundTransaction = fakeTransferOut({
        userId,
        accountId: sourceAccount.id,
        currency: "USD",
        amount: 100,
        transferId,
      });
      const inboundTransaction = fakeTransferIn({
        userId,
        accountId: destAccount.id,
        currency: "USD",
        amount: 100,
        transferId,
      });
      // Returns existing pair
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        outboundTransaction,
        inboundTransaction,
      ]);
      // Returns accounts including archived
      mockAccountRepository.findOneWithArchivedById
        .mockResolvedValueOnce(sourceAccount)
        .mockResolvedValueOnce(destAccount);
      // Persists update atomically
      mockAtomicWriter.commit.mockResolvedValue({
        createdTransactions: [],
        updatedTransactions: [],
        updatedAccounts: [],
      });

      // Act
      const result = await service.updateTransfer(transferId, userId, {
        description: "Updated note",
      });

      // Assert
      expect(result).toEqualSuccess();
      const commitInput = mockAtomicWriter.commit.mock.calls[0]?.[0];
      expect(commitInput?.accountsToUpdate).toEqual([]);
      expect(commitInput?.transactionsToUpdate?.[0]).toMatchObject({
        description: "Updated note",
      });
    });

    it("preserves existing accounts when not provided", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      const sourceAccount = fakeAccount({ userId, currency: "USD" });
      const destAccount = fakeAccount({ userId, currency: "USD" });
      const outboundTransaction = fakeTransferOut({
        userId,
        accountId: sourceAccount.id,
        currency: "USD",
        amount: 100,
        transferId,
      });
      const inboundTransaction = fakeTransferIn({
        userId,
        accountId: destAccount.id,
        currency: "USD",
        amount: 100,
        transferId,
      });
      // Returns existing pair
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        outboundTransaction,
        inboundTransaction,
      ]);
      // Returns accounts including archived
      mockAccountRepository.findOneWithArchivedById
        .mockResolvedValueOnce(sourceAccount)
        .mockResolvedValueOnce(destAccount);
      // Persists update atomically
      mockAtomicWriter.commit.mockResolvedValue({
        createdTransactions: [],
        updatedTransactions: [],
        updatedAccounts: [],
      });

      // Act
      const result = await service.updateTransfer(transferId, userId, {
        date: toDateString("2024-06-01"),
      });

      // Assert
      expect(result).toEqualSuccess();
      expect(
        mockAccountRepository.findOneWithArchivedById,
      ).toHaveBeenCalledWith({
        id: sourceAccount.id,
        userId,
      });
      expect(
        mockAccountRepository.findOneWithArchivedById,
      ).toHaveBeenCalledWith({
        id: destAccount.id,
        userId,
      });
      const commitInput = mockAtomicWriter.commit.mock.calls[0]?.[0];
      expect(commitInput?.transactionsToUpdate?.[0]?.accountId).toBe(
        sourceAccount.id,
      );
      expect(commitInput?.transactionsToUpdate?.[1]?.accountId).toBe(
        destAccount.id,
      );
    });

    // Validation failures

    it("fails when transfer not found", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      // Returns no transactions
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([]);

      // Act
      const result = await service.updateTransfer(transferId, userId, {
        amount: 50,
      });

      // Assert
      expect(result).toEqualFailure(
        "Transfer not found or doesn't belong to user",
      );
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    it("fails when source account equals destination account", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      const sourceAccount = fakeAccount({ userId, currency: "USD" });
      const destinationAccount = fakeAccount({ userId, currency: "USD" });
      const outboundTransaction = fakeTransferOut({
        userId,
        accountId: sourceAccount.id,
        currency: "USD",
        transferId,
      });
      const inboundTransaction = fakeTransferIn({
        userId,
        accountId: destinationAccount.id,
        currency: "USD",
        transferId,
      });
      // Returns existing pair
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        outboundTransaction,
        inboundTransaction,
      ]);

      // Act
      const result = await service.updateTransfer(transferId, userId, {
        fromAccountId: sourceAccount.id,
        toAccountId: sourceAccount.id,
      });

      // Assert
      expect(result).toEqualFailure(
        "Cannot transfer money to the same account",
      );
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    it("fails when new source account not found", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      const oldSourceAccount = fakeAccount({ userId });
      const destAccount = fakeAccount({ userId });
      const outboundTransaction = fakeTransferOut({
        userId,
        accountId: oldSourceAccount.id,
        transferId,
      });
      const inboundTransaction = fakeTransferIn({
        userId,
        accountId: destAccount.id,
        transferId,
      });
      // Returns existing pair
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        outboundTransaction,
        inboundTransaction,
      ]);
      // Returns old accounts including archived
      mockAccountRepository.findOneWithArchivedById
        .mockResolvedValueOnce(oldSourceAccount)
        .mockResolvedValueOnce(destAccount);
      // Returns no new source account
      mockAccountRepository.findOneById.mockResolvedValueOnce(null);

      // Act
      const result = await service.updateTransfer(transferId, userId, {
        fromAccountId: faker.string.uuid(),
      });

      // Assert
      expect(result).toEqualFailure(
        "Account not found or doesn't belong to user",
      );
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    it("fails when new destination account not found", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      const sourceAccount = fakeAccount({ userId });
      const oldDestAccount = fakeAccount({ userId });
      const outboundTransaction = fakeTransferOut({
        userId,
        accountId: sourceAccount.id,
        transferId,
      });
      const inboundTransaction = fakeTransferIn({
        userId,
        accountId: oldDestAccount.id,
        transferId,
      });
      // Returns existing pair
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        outboundTransaction,
        inboundTransaction,
      ]);
      // Returns old accounts including archived
      mockAccountRepository.findOneWithArchivedById
        .mockResolvedValueOnce(sourceAccount)
        .mockResolvedValueOnce(oldDestAccount);
      // Returns no new destination account
      mockAccountRepository.findOneById.mockResolvedValueOnce(null);

      // Act
      const result = await service.updateTransfer(transferId, userId, {
        toAccountId: faker.string.uuid(),
      });

      // Assert
      expect(result).toEqualFailure(
        "Account not found or doesn't belong to user",
      );
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    it("fails when new source account currency does not match destination", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      const oldSourceAccount = fakeAccount({ userId, currency: "USD" });
      const oldDestAccount = fakeAccount({ userId, currency: "USD" });
      const newSourceAccount = fakeAccount({ userId, currency: "EUR" });
      const outboundTransaction = fakeTransferOut({
        userId,
        accountId: oldSourceAccount.id,
        currency: "USD",
        transferId,
      });
      const inboundTransaction = fakeTransferIn({
        userId,
        accountId: oldDestAccount.id,
        currency: "USD",
        transferId,
      });
      // Returns existing pair
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        outboundTransaction,
        inboundTransaction,
      ]);
      // Returns old accounts including archived
      mockAccountRepository.findOneWithArchivedById
        .mockResolvedValueOnce(oldSourceAccount)
        .mockResolvedValueOnce(oldDestAccount);
      // Returns new source account with mismatched currency
      mockAccountRepository.findOneById.mockResolvedValueOnce(newSourceAccount);

      // Act
      const result = await service.updateTransfer(transferId, userId, {
        fromAccountId: newSourceAccount.id,
      });

      // Assert
      expect(result).toEqualFailure(
        "Cannot transfer between accounts with different currencies. Source account uses EUR, destination account uses USD",
      );
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    it("propagates ModelError when amount is invalid", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      const sourceAccount = fakeAccount({ userId, currency: "USD" });
      const destAccount = fakeAccount({ userId, currency: "USD" });
      const outboundTransaction = fakeTransferOut({
        userId,
        accountId: sourceAccount.id,
        currency: "USD",
        transferId,
      });
      const inboundTransaction = fakeTransferIn({
        userId,
        accountId: destAccount.id,
        currency: "USD",
        transferId,
      });
      // Returns existing pair
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        outboundTransaction,
        inboundTransaction,
      ]);
      // Returns old accounts including archived
      mockAccountRepository.findOneWithArchivedById
        .mockResolvedValueOnce(sourceAccount)
        .mockResolvedValueOnce(destAccount);

      // Act & Assert
      await expect(
        service.updateTransfer(transferId, userId, { amount: -1 }),
      ).rejects.toThrow(new ModelError("Amount must be positive"));
      expect(mockAtomicWriter.commit).not.toHaveBeenCalled();
    });

    // Dependency failures

    it("fails when atomic commit rejects", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      const sourceAccount = fakeAccount({ userId, currency: "USD" });
      const destAccount = fakeAccount({ userId, currency: "USD" });
      const outboundTransaction = fakeTransferOut({
        userId,
        accountId: sourceAccount.id,
        currency: "USD",
        amount: 100,
        transferId,
      });
      const inboundTransaction = fakeTransferIn({
        userId,
        accountId: destAccount.id,
        currency: "USD",
        amount: 100,
        transferId,
      });
      // Returns existing pair
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        outboundTransaction,
        inboundTransaction,
      ]);
      // Returns old accounts including archived
      mockAccountRepository.findOneWithArchivedById
        .mockResolvedValueOnce(sourceAccount)
        .mockResolvedValueOnce(destAccount);
      // Rejects with unexpected error
      mockAtomicWriter.commit.mockRejectedValue(new Error("DB down"));
      // Suppress error log noise
      vi.spyOn(console, "error").mockImplementation(vi.fn());

      // Act
      const result = await service.updateTransfer(transferId, userId, {
        amount: 50,
      });

      // Assert
      expect(result).toEqualFailure("Failed to update transfer transactions");
    });
  });
});
