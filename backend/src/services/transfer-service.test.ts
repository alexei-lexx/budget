import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ModelError } from "../models/model-error";
import {
  TransactionType,
  archiveTransactionModel,
  createTransactionModel,
  updateTransactionModel,
} from "../models/transaction";
import { AccountRepository } from "../ports/account-repository";
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
  let mockCreateTransactionModel: jest.MockedFunction<
    typeof createTransactionModel
  >;
  let mockUpdateTransactionModel: jest.MockedFunction<
    typeof updateTransactionModel
  >;
  let mockArchiveTransactionModel: jest.MockedFunction<
    typeof archiveTransactionModel
  >;

  beforeEach(() => {
    mockAccountRepository = createMockAccountRepository();
    mockTransactionRepository = createMockTransactionRepository();
    mockCreateTransactionModel = jest.fn<typeof createTransactionModel>();
    mockUpdateTransactionModel = jest.fn<typeof updateTransactionModel>();
    mockArchiveTransactionModel = jest.fn<typeof archiveTransactionModel>();

    service = new TransferService({
      accountRepository: mockAccountRepository,
      transactionRepository: mockTransactionRepository,
      createTransactionModel: mockCreateTransactionModel,
      updateTransactionModel: mockUpdateTransactionModel,
      archiveTransactionModel: mockArchiveTransactionModel,
    });

    userId = faker.string.uuid();

    jest.clearAllMocks();
  });

  describe("getTransfer", () => {
    it("should return undefined when transfer not found", async () => {
      const transferId = faker.string.uuid();
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([]);

      const result = await service.getTransfer(transferId, userId);

      expect(result).toBeUndefined();
      expect(
        mockTransactionRepository.findManyByTransferId,
      ).toHaveBeenCalledWith({ transferId, userId });
    });

    it("should throw INVALID_TRANSFER_STATE when only one transaction found", async () => {
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

    it("should throw INVALID_TRANSFER_STATE when more than two transactions found", async () => {
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

    it("should throw INVALID_TRANSFER_STATE when TRANSFER_OUT transaction is missing", async () => {
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

    it("should throw INVALID_TRANSFER_STATE when TRANSFER_IN transaction is missing", async () => {
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

    it("should return transfer result with correctly identified outbound and inbound transactions", async () => {
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

    it("should identify outbound and inbound correctly regardless of array order", async () => {
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
    it("should create transfer and return result with outbound and inbound transactions", async () => {
      const fromAccount = fakeAccount({ userId });
      const toAccount = fakeAccount({ userId, currency: fromAccount.currency });
      const outboundTransaction = fakeTransaction({
        type: TransactionType.TRANSFER_OUT,
      });
      const inboundTransaction = fakeTransaction({
        type: TransactionType.TRANSFER_IN,
      });

      mockAccountRepository.findOneById
        .mockResolvedValueOnce(fromAccount)
        .mockResolvedValueOnce(toAccount);
      mockCreateTransactionModel
        .mockReturnValueOnce(outboundTransaction)
        .mockReturnValueOnce(inboundTransaction);
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

      expect(result).toEqual({
        transferId: expect.any(String),
        outboundTransaction,
        inboundTransaction,
      });
      expect(mockCreateTransactionModel).toHaveBeenNthCalledWith(1, {
        userId,
        account: fromAccount,
        type: TransactionType.TRANSFER_OUT,
        amount: 100,
        date: toDateString("2024-01-01"),
        description: undefined,
        transferId: result.transferId,
      });
      expect(mockCreateTransactionModel).toHaveBeenNthCalledWith(2, {
        userId,
        account: toAccount,
        type: TransactionType.TRANSFER_IN,
        amount: 100,
        date: toDateString("2024-01-01"),
        description: undefined,
        transferId: result.transferId,
      });
      expect(mockTransactionRepository.createMany).toHaveBeenCalledWith([
        outboundTransaction,
        inboundTransaction,
      ]);
    });
  });

  describe("updateTransfer", () => {
    // Happy path

    it("should update transfer and return result with updated transactions", async () => {
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
      const updatedOutbound = fakeTransaction({
        id: outboundTransaction.id,
        type: TransactionType.TRANSFER_OUT,
      });
      const updatedInbound = fakeTransaction({
        id: inboundTransaction.id,
        type: TransactionType.TRANSFER_IN,
      });

      // Returns existing pair, then updated pair on refetch
      mockTransactionRepository.findManyByTransferId
        .mockResolvedValueOnce([outboundTransaction, inboundTransaction])
        .mockResolvedValueOnce([updatedOutbound, updatedInbound]);
      // Returns accounts owned by user
      mockAccountRepository.findOneById
        .mockResolvedValueOnce(fromAccount)
        .mockResolvedValueOnce(toAccount);
      // Returns updated transactions
      mockUpdateTransactionModel
        .mockReturnValueOnce(updatedOutbound)
        .mockReturnValueOnce(updatedInbound);

      // Act
      const result = await service.updateTransfer(transferId, userId, {
        amount: 200,
      });

      // Assert
      expect(result).toEqual({
        transferId,
        outboundTransaction: updatedOutbound,
        inboundTransaction: updatedInbound,
      });
      expect(mockUpdateTransactionModel).toHaveBeenNthCalledWith(
        1,
        outboundTransaction,
        {
          account: undefined,
          amount: 200,
          date: undefined,
          description: undefined,
        },
      );
      expect(mockUpdateTransactionModel).toHaveBeenNthCalledWith(
        2,
        inboundTransaction,
        {
          account: undefined,
          amount: 200,
          date: undefined,
          description: undefined,
        },
      );
      expect(mockTransactionRepository.updateMany).toHaveBeenCalledWith([
        updatedOutbound,
        updatedInbound,
      ]);
    });

    it("should resolve new accounts when account ids change", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      const fromAccount = fakeAccount({ userId });
      const toAccount = fakeAccount({ userId, currency: fromAccount.currency });
      const outboundTransaction = fakeTransaction({
        type: TransactionType.TRANSFER_OUT,
        transferId,
      });
      const inboundTransaction = fakeTransaction({
        type: TransactionType.TRANSFER_IN,
        transferId,
      });

      // Returns existing pair on both lookups
      mockTransactionRepository.findManyByTransferId
        .mockResolvedValueOnce([outboundTransaction, inboundTransaction])
        .mockResolvedValueOnce([outboundTransaction, inboundTransaction]);
      // Returns accounts owned by user
      mockAccountRepository.findOneById
        .mockResolvedValueOnce(fromAccount)
        .mockResolvedValueOnce(toAccount);
      // Returns built updated sides
      mockUpdateTransactionModel
        .mockReturnValueOnce(outboundTransaction)
        .mockReturnValueOnce(inboundTransaction);

      // Act
      await service.updateTransfer(transferId, userId, {
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
      });

      // Assert
      expect(mockUpdateTransactionModel).toHaveBeenNthCalledWith(
        1,
        outboundTransaction,
        expect.objectContaining({ account: fromAccount }),
      );
      expect(mockUpdateTransactionModel).toHaveBeenNthCalledWith(
        2,
        inboundTransaction,
        expect.objectContaining({ account: toAccount }),
      );
    });

    // Dependency failures

    it("should propagate ModelError without persisting", async () => {
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
      // Model rejects input
      mockUpdateTransactionModel.mockImplementation(() => {
        throw new ModelError("Amount must be positive");
      });

      // Act
      const promise = service.updateTransfer(transferId, userId, {
        amount: -1,
      });

      // Assert
      await expect(promise).rejects.toThrow(ModelError);
      expect(mockTransactionRepository.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("deleteTransfer", () => {
    // Happy path

    it("should archive both paired transactions", async () => {
      // Arrange
      const transferId = faker.string.uuid();
      const outboundTransaction = fakeTransaction();
      const inboundTransaction = fakeTransaction();
      const archivedOutbound = fakeTransaction();
      const archivedInbound = fakeTransaction();

      // Returns existing pair
      mockTransactionRepository.findManyByTransferId.mockResolvedValue([
        outboundTransaction,
        inboundTransaction,
      ]);
      // Returns archived sides
      mockArchiveTransactionModel
        .mockReturnValueOnce(archivedOutbound)
        .mockReturnValueOnce(archivedInbound);

      // Act
      await service.deleteTransfer(transferId, userId);

      // Assert
      expect(mockArchiveTransactionModel).toHaveBeenNthCalledWith(
        1,
        outboundTransaction,
      );
      expect(mockArchiveTransactionModel).toHaveBeenNthCalledWith(
        2,
        inboundTransaction,
      );
      expect(mockTransactionRepository.updateMany).toHaveBeenCalledWith([
        archivedOutbound,
        archivedInbound,
      ]);
    });

    // Validation failures

    it("should throw when transfer not found", async () => {
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
      expect(mockArchiveTransactionModel).not.toHaveBeenCalled();
      expect(mockTransactionRepository.updateMany).not.toHaveBeenCalled();
    });
  });
});
