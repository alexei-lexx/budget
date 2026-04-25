import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ModelError } from "../models/model-error";
import { TransactionType } from "../models/transaction";
import { AccountRepository } from "../ports/account-repository";
import { VersionConflictError } from "../ports/repository-error";
import { TransactionRepository } from "../ports/transaction-repository";
import { toDateString } from "../types/date";
import { fakeAccount } from "../utils/test-utils/models/account-fakes";
import { fakeTransaction } from "../utils/test-utils/models/transaction-fakes";
import { createMockAccountRepository } from "../utils/test-utils/repositories/account-repository-mocks";
import { createMockTransactionRepository } from "../utils/test-utils/repositories/transaction-repository-mocks";
import { BusinessError } from "./business-error";
import { TransferService } from "./transfer-service";

describe("TransferService", () => {
  let service: TransferService;
  let userId: string;
  let mockTransactionRepository: jest.Mocked<TransactionRepository>;
  let mockAccountRepository: jest.Mocked<AccountRepository>;

  beforeEach(() => {
    mockAccountRepository = createMockAccountRepository();
    mockTransactionRepository = createMockTransactionRepository();

    service = new TransferService({
      accountRepository: mockAccountRepository,
      transactionRepository: mockTransactionRepository,
    });

    userId = faker.string.uuid();

    jest.clearAllMocks();
  });

  describe("getTransfer", () => {
    it("returns undefined when transfer not found", async () => {
      const transferId = faker.string.uuid();
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([]);

      const result = await service.getTransfer(transferId, userId);

      expect(result).toBeUndefined();
      expect(
        mockTransactionRepository.findManyByTransferId,
      ).toHaveBeenCalledWith({ transferId, userId });
    });

    it("throws INVALID_TRANSFER_STATE when only one transaction found", async () => {
      const transferId = faker.string.uuid();
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        fakeTransaction({ type: TransactionType.TRANSFER_OUT, transferId }),
      ]);

      const promise = service.getTransfer(transferId, userId);
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Invalid transfer state: expected 2 transactions, found 1",
      });
    });

    it("throws INVALID_TRANSFER_STATE when more than two transactions found", async () => {
      const transferId = faker.string.uuid();
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        fakeTransaction({ type: TransactionType.TRANSFER_OUT, transferId }),
        fakeTransaction({ type: TransactionType.TRANSFER_IN, transferId }),
        fakeTransaction({ type: TransactionType.TRANSFER_OUT, transferId }),
      ]);

      const promise = service.getTransfer(transferId, userId);
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Invalid transfer state: expected 2 transactions, found 3",
      });
    });

    it("throws INVALID_TRANSFER_STATE when TRANSFER_OUT transaction is missing", async () => {
      const transferId = faker.string.uuid();
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        fakeTransaction({ type: TransactionType.TRANSFER_IN, transferId }),
        fakeTransaction({ type: TransactionType.TRANSFER_IN, transferId }),
      ]);

      const promise = service.getTransfer(transferId, userId);
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Invalid transfer state: missing TRANSFER_OUT transaction",
      });
    });

    it("throws INVALID_TRANSFER_STATE when TRANSFER_IN transaction is missing", async () => {
      const transferId = faker.string.uuid();
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        fakeTransaction({ type: TransactionType.TRANSFER_OUT, transferId }),
        fakeTransaction({ type: TransactionType.TRANSFER_OUT, transferId }),
      ]);

      const promise = service.getTransfer(transferId, userId);
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Invalid transfer state: missing TRANSFER_IN transaction",
      });
    });

    it("returns transfer result with correctly identified outbound and inbound transactions", async () => {
      const transferId = faker.string.uuid();
      const outboundTransaction = fakeTransaction({
        type: TransactionType.TRANSFER_OUT,
        transferId,
      });
      const inboundTransaction = fakeTransaction({
        type: TransactionType.TRANSFER_IN,
        transferId,
      });
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        outboundTransaction,
        inboundTransaction,
      ]);

      const result = await service.getTransfer(transferId, userId);

      expect(result).toEqual({
        transferId,
        outboundTransaction,
        inboundTransaction,
      });
    });

    it("identifies outbound and inbound correctly regardless of array order", async () => {
      const transferId = faker.string.uuid();
      const outboundTransaction = fakeTransaction({
        type: TransactionType.TRANSFER_OUT,
        transferId,
      });
      const inboundTransaction = fakeTransaction({
        type: TransactionType.TRANSFER_IN,
        transferId,
      });
      // Inbound arrives first in the array
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        inboundTransaction,
        outboundTransaction,
      ]);

      const result = await service.getTransfer(transferId, userId);

      expect(result).toEqual({
        transferId,
        outboundTransaction,
        inboundTransaction,
      });
    });
  });

  describe("createTransfer", () => {
    it("creates transfer and returns result with outbound and inbound transactions", async () => {
      const fromAccount = fakeAccount({ userId });
      const toAccount = fakeAccount({ userId, currency: fromAccount.currency });

      mockAccountRepository.findOneById
        .mockResolvedValueOnce(fromAccount)
        .mockResolvedValueOnce(toAccount);
      mockTransactionRepository.createMany.mockResolvedValue();

      const result = await service.createTransfer(
        {
          fromAccountId: fromAccount.id,
          toAccountId: toAccount.id,
          amount: 100,
          date: toDateString("2024-01-01"),
        },
        userId,
      );

      expect(result.transferId).toEqual(expect.any(String));
      expect(result.outboundTransaction).toEqual(
        expect.objectContaining({
          userId,
          accountId: fromAccount.id,
          type: TransactionType.TRANSFER_OUT,
          amount: 100,
          date: toDateString("2024-01-01"),
          transferId: result.transferId,
        }),
      );
      expect(result.inboundTransaction).toEqual(
        expect.objectContaining({
          userId,
          accountId: toAccount.id,
          type: TransactionType.TRANSFER_IN,
          amount: 100,
          date: toDateString("2024-01-01"),
          transferId: result.transferId,
        }),
      );
      expect(mockTransactionRepository.createMany).toHaveBeenCalledWith([
        result.outboundTransaction,
        result.inboundTransaction,
      ]);
    });
  });

  describe("updateTransfer", () => {
    // Happy path

    it("updates transfer and returns result with updated transactions", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      const fromAccount = fakeAccount({ userId });
      const toAccount = fakeAccount({ userId, currency: fromAccount.currency });
      const outboundTransaction = fakeTransaction({
        userId,
        type: TransactionType.TRANSFER_OUT,
        transferId,
        accountId: fromAccount.id,
        currency: fromAccount.currency,
      });
      const inboundTransaction = fakeTransaction({
        userId,
        type: TransactionType.TRANSFER_IN,
        transferId,
        accountId: toAccount.id,
        currency: toAccount.currency,
      });
      const updatedOutbound = outboundTransaction.update({ amount: 200 });
      const updatedInbound = inboundTransaction.update({ amount: 200 });

      // Returns existing pair, then updated pair on refetch
      mockTransactionRepository.findManyByTransferId
        .mockResolvedValueOnce([outboundTransaction, inboundTransaction])
        .mockResolvedValueOnce([updatedOutbound, updatedInbound]);
      // Returns accounts owned by user
      mockAccountRepository.findOneById
        .mockResolvedValueOnce(fromAccount)
        .mockResolvedValueOnce(toAccount);
      mockTransactionRepository.updateMany.mockImplementation(async (txs) => [
        ...txs,
      ]);

      // Act
      const result = await service.updateTransfer(transferId, userId, {
        amount: 200,
      });

      // Assert
      expect(result.transferId).toBe(transferId);
      expect(result.outboundTransaction.amount).toBe(200);
      expect(result.inboundTransaction.amount).toBe(200);
      expect(mockTransactionRepository.updateMany).toHaveBeenCalledWith([
        expect.objectContaining({
          id: outboundTransaction.id,
          amount: 200,
          accountId: fromAccount.id,
        }),
        expect.objectContaining({
          id: inboundTransaction.id,
          amount: 200,
          accountId: toAccount.id,
        }),
      ]);
    });

    it("resolves new accounts when account ids change", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      const fromAccount = fakeAccount({ userId });
      const toAccount = fakeAccount({ userId, currency: fromAccount.currency });
      const outboundTransaction = fakeTransaction({
        userId,
        type: TransactionType.TRANSFER_OUT,
        transferId,
        currency: fromAccount.currency,
      });
      const inboundTransaction = fakeTransaction({
        userId,
        type: TransactionType.TRANSFER_IN,
        transferId,
        currency: toAccount.currency,
      });

      // Returns existing pair on both lookups
      mockTransactionRepository.findManyByTransferId
        .mockResolvedValueOnce([outboundTransaction, inboundTransaction])
        .mockResolvedValueOnce([outboundTransaction, inboundTransaction]);
      // Returns accounts owned by user
      mockAccountRepository.findOneById
        .mockResolvedValueOnce(fromAccount)
        .mockResolvedValueOnce(toAccount);
      mockTransactionRepository.updateMany.mockImplementation(async (txs) => [
        ...txs,
      ]);

      // Act
      await service.updateTransfer(transferId, userId, {
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
      });

      // Assert
      expect(mockTransactionRepository.updateMany).toHaveBeenCalledWith([
        expect.objectContaining({ accountId: fromAccount.id }),
        expect.objectContaining({ accountId: toAccount.id }),
      ]);
    });

    // Dependency failures

    it("maps VersionConflictError from repo to BusinessError", async () => {
      // Arrange
      const fromAccount = fakeAccount({ userId });
      const toAccount = fakeAccount({ userId, currency: fromAccount.currency });
      const transferId = faker.string.uuid();
      const outbound = fakeTransaction({
        userId,
        accountId: fromAccount.id,
        type: TransactionType.TRANSFER_OUT,
        transferId,
        categoryId: undefined,
      });
      const inbound = fakeTransaction({
        userId,
        accountId: toAccount.id,
        type: TransactionType.TRANSFER_IN,
        transferId,
        categoryId: undefined,
      });
      // Returns existing pair
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        outbound,
        inbound,
      ]);
      // Returns accounts owned by user
      mockAccountRepository.findOneById.mockImplementation(async ({ id }) =>
        id === fromAccount.id ? fromAccount : toAccount,
      );
      // Repository rejects with version conflict
      mockTransactionRepository.updateMany.mockRejectedValue(
        new VersionConflictError(),
      );

      // Act & Assert
      await expect(
        service.updateTransfer(transferId, userId, { amount: 50 }),
      ).rejects.toThrow(
        new BusinessError("Transfer was modified, please reload and try again"),
      );
    });

    it("propagates ModelError without persisting", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      const fromAccount = fakeAccount({ userId });
      const toAccount = fakeAccount({ userId, currency: fromAccount.currency });
      const outboundTransaction = fakeTransaction({
        type: TransactionType.TRANSFER_OUT,
        transferId,
        accountId: fromAccount.id,
      });
      const inboundTransaction = fakeTransaction({
        type: TransactionType.TRANSFER_IN,
        transferId,
        accountId: toAccount.id,
      });

      // Returns existing pair
      mockTransactionRepository.findManyByTransferId.mockResolvedValueOnce([
        outboundTransaction,
        inboundTransaction,
      ]);
      // Returns accounts owned by user
      mockAccountRepository.findOneById
        .mockResolvedValueOnce(fromAccount)
        .mockResolvedValueOnce(toAccount);

      // Act
      const promise = service.updateTransfer(transferId, userId, {
        amount: -1,
      });

      // Assert
      await expect(promise).rejects.toThrow(ModelError);
      await expect(promise).rejects.toMatchObject({
        message: "Amount must be positive",
      });
      expect(mockTransactionRepository.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("deleteTransfer", () => {
    // Happy path

    it("archives both paired transactions", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      const outboundTransaction = fakeTransaction();
      const inboundTransaction = fakeTransaction();

      // Returns existing pair
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        outboundTransaction,
        inboundTransaction,
      ]);
      mockTransactionRepository.updateMany.mockImplementation(async (txs) => [
        ...txs,
      ]);

      // Act
      await service.deleteTransfer(transferId, userId);

      // Assert
      expect(mockTransactionRepository.updateMany).toHaveBeenCalledWith([
        expect.objectContaining({
          id: outboundTransaction.id,
          isArchived: true,
        }),
        expect.objectContaining({
          id: inboundTransaction.id,
          isArchived: true,
        }),
      ]);
    });

    // Validation failures

    it("throws when transfer not found", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([]);

      // Act
      const promise = service.deleteTransfer(transferId, userId);

      // Assert
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Transfer not found or doesn't belong to user",
      });
      expect(mockTransactionRepository.updateMany).not.toHaveBeenCalled();
    });

    // Dependency failures

    it("maps VersionConflictError from repo to BusinessError", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      const outbound = fakeTransaction({
        userId,
        type: TransactionType.TRANSFER_OUT,
        transferId,
        categoryId: undefined,
      });
      const inbound = fakeTransaction({
        userId,
        type: TransactionType.TRANSFER_IN,
        transferId,
        categoryId: undefined,
      });
      // Returns existing pair
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        outbound,
        inbound,
      ]);
      // Repository rejects with version conflict
      mockTransactionRepository.updateMany.mockRejectedValue(
        new VersionConflictError(),
      );

      // Act & Assert
      await expect(service.deleteTransfer(transferId, userId)).rejects.toThrow(
        new BusinessError("Transfer was modified, please reload and try again"),
      );
    });
  });
});
