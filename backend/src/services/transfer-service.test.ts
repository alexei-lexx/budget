import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { TransactionType } from "../models/transaction";
import { toDateString } from "../types/date";
import { DESCRIPTION_MAX_LENGTH } from "../types/validation";
import { fakeAccount } from "../utils/test-utils/models/account-fakes";
import { fakeTransaction } from "../utils/test-utils/models/transaction-fakes";
import { createMockAccountRepository } from "../utils/test-utils/repositories/account-repository-mocks";
import { createMockTransactionRepository } from "../utils/test-utils/repositories/transaction-repository-mocks";
import { BusinessError } from "./business-error";
import { AccountRepository } from "./ports/account-repository";
import { TransactionRepository } from "./ports/transaction-repository";
import { TransferService } from "./transfer-service";

describe("TransferService", () => {
  let service: TransferService;
  let userId: string;
  let mockTransactionRepository: jest.Mocked<TransactionRepository>;
  let mockAccountRepository: jest.Mocked<AccountRepository>;

  beforeEach(() => {
    mockTransactionRepository = createMockTransactionRepository();
    mockAccountRepository = createMockAccountRepository();

    service = new TransferService(
      mockTransactionRepository,
      mockAccountRepository,
    );

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
      const transferId = faker.string.uuid();
      const outboundTransaction = fakeTransaction({
        type: TransactionType.TRANSFER_OUT,
        transferId,
      });
      const inboundTransaction = fakeTransaction({
        type: TransactionType.TRANSFER_IN,
        transferId,
      });

      mockAccountRepository.findOneById
        .mockResolvedValueOnce(fromAccount)
        .mockResolvedValueOnce(toAccount);
      mockTransactionRepository.createMany.mockResolvedValue([
        outboundTransaction,
        inboundTransaction,
      ]);

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
    });

    it("should reject description exceeding maximum length", async () => {
      const promise = service.createTransfer(
        {
          fromAccountId: faker.string.uuid(),
          toAccountId: faker.string.uuid(),
          amount: 100,
          date: toDateString("2024-01-01"),
          description: "a".repeat(DESCRIPTION_MAX_LENGTH + 1),
        },
        userId,
      );

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`,
      });

      expect(mockTransactionRepository.createMany).not.toHaveBeenCalled();
    });
  });

  describe("updateTransfer", () => {
    it("should update transfer and return result with updated transactions", async () => {
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

      mockTransactionRepository.findManyByTransferId
        .mockResolvedValueOnce([outboundTransaction, inboundTransaction])
        .mockResolvedValueOnce([outboundTransaction, inboundTransaction]);
      mockAccountRepository.findOneById
        .mockResolvedValueOnce(fromAccount)
        .mockResolvedValueOnce(toAccount);

      const result = await service.updateTransfer(transferId, userId, {
        amount: 200,
      });

      expect(result).toEqual({
        transferId,
        outboundTransaction,
        inboundTransaction,
      });
    });

    it("should reject description exceeding maximum length", async () => {
      const promise = service.updateTransfer(faker.string.uuid(), userId, {
        description: "a".repeat(DESCRIPTION_MAX_LENGTH + 1),
      });

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`,
      });

      expect(mockTransactionRepository.updateMany).not.toHaveBeenCalled();
    });
  });
});
