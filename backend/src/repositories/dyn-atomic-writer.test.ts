import { beforeEach, describe, expect, it } from "@jest/globals";
import {
  DYNAMODB_TRANSACT_WRITE_MAX_ITEMS,
  createDynamoDBDocumentClient,
} from "../utils/dynamo-client";
import { requireEnv } from "../utils/require-env";
import { fakeTransaction } from "../utils/test-utils/models/transaction-fakes";
import { DynAtomicWriter } from "./dyn-atomic-writer";
import { DynTransactionRepository } from "./dyn-transaction-repository";

describe("DynAtomicWriter", () => {
  const tableName = requireEnv("TRANSACTIONS_TABLE_NAME");
  const transactionRepository = new DynTransactionRepository(tableName);
  let writer: DynAtomicWriter;

  beforeEach(() => {
    // Do not truncate the transactions table here:
    // dyn-transaction-repository.test.ts runs in parallel
    // and uses the same table.

    writer = new DynAtomicWriter({
      client: createDynamoDBDocumentClient(),
      transactionWriteItemBuilder: transactionRepository,
    });
  });

  describe("appendCreateTransaction", () => {
    // Happy path

    it("persists transaction after commit", async () => {
      // Arrange

      // Transaction to create via writer
      const transaction = fakeTransaction();

      // Act
      writer.appendCreateTransaction(transaction);
      await writer.commit();

      // Assert
      const stored = await transactionRepository.findOneById({
        id: transaction.id,
        userId: transaction.userId,
      });
      expect(stored).toEqual(transaction);
    });

    it("does not persist transaction when commit is never called", async () => {
      // Arrange

      // Transaction queued via writer but commit intentionally skipped
      const transaction = fakeTransaction();

      // Act
      writer.appendCreateTransaction(transaction);

      // Assert
      const stored = await transactionRepository.findOneById({
        id: transaction.id,
        userId: transaction.userId,
      });
      expect(stored).toBeNull();
    });
  });

  describe("appendUpdateTransaction", () => {
    // Happy path

    it("updates existing transaction after commit", async () => {
      // Arrange

      // Existing transaction persisted with original amount
      const original = fakeTransaction({ amount: 10 });
      await transactionRepository.create(original);

      // Same transaction with modified amount to update via writer
      const updated = { ...original, amount: 99 };

      // Act
      writer.appendUpdateTransaction(updated);
      await writer.commit();

      // Assert
      const stored = await transactionRepository.findOneById({
        id: original.id,
        userId: original.userId,
      });
      expect(stored?.amount).toEqual(updated.amount);
    });

    it("does not update transaction when commit is never called", async () => {
      // Arrange

      // Existing transaction persisted with original amount
      const original = fakeTransaction({ amount: 10 });
      await transactionRepository.create(original);

      // Queue update but skip commit
      const updated = { ...original, amount: 99 };

      // Act
      writer.appendUpdateTransaction(updated);

      // Assert
      const stored = await transactionRepository.findOneById({
        id: original.id,
        userId: original.userId,
      });
      expect(stored).toEqual(original);
    });

    // Dependency failures

    it("throws when expected version does not match stored row", async () => {
      // Arrange

      // Existing transaction persisted at version 5
      const original = fakeTransaction({ amount: 10, version: 5 });
      await transactionRepository.create(original);

      // Stale copy with outdated expected version
      const stale = { ...original, amount: 99, version: 4 };

      writer.appendUpdateTransaction(stale);

      // Act & Assert
      await expect(writer.commit()).rejects.toThrow();

      const stored = await transactionRepository.findOneById({
        id: original.id,
        userId: original.userId,
      });
      expect(stored).toEqual(original);
    });
  });

  describe("commit", () => {
    // Happy path

    it("persists all appended operations in single transaction", async () => {
      // Arrange

      // Existing row to update
      const existingTransaction = fakeTransaction({ amount: 10 });
      await transactionRepository.create(existingTransaction);

      // New row to create in same batch
      const newTransaction = fakeTransaction();

      // Same existing row with mutated amount
      const updatedTransaction = { ...existingTransaction, amount: 99 };

      // Act
      writer.appendCreateTransaction(newTransaction);
      writer.appendUpdateTransaction(updatedTransaction);
      await writer.commit();

      // Assert
      const storedNew = await transactionRepository.findOneById({
        id: newTransaction.id,
        userId: newTransaction.userId,
      });
      expect(storedNew).toEqual(newTransaction);

      const storedUpdated = await transactionRepository.findOneById({
        id: existingTransaction.id,
        userId: existingTransaction.userId,
      });
      expect(storedUpdated).toEqual({
        ...updatedTransaction,
        version: existingTransaction.version + 1,
      });
    });

    // Validation failures

    it("throws when no items have been appended", async () => {
      // Act & Assert
      await expect(writer.commit()).rejects.toThrow("Nothing to commit");
    });

    it("throws when appended items exceed DynamoDB TransactWrite max", async () => {
      // Arrange

      // Append one transaction over the max to trip the guard
      for (let i = 0; i < DYNAMODB_TRANSACT_WRITE_MAX_ITEMS + 1; i++) {
        writer.appendCreateTransaction(fakeTransaction());
      }

      // Act & Assert
      await expect(writer.commit()).rejects.toThrow(
        `Exceeds DynamoDB TransactWrite max items (${DYNAMODB_TRANSACT_WRITE_MAX_ITEMS})`,
      );
    });

    it("throws when invoked twice", async () => {
      // Arrange

      // First commit succeeds
      const transaction = fakeTransaction();
      writer.appendCreateTransaction(transaction);
      await writer.commit();

      // Act & Assert
      await expect(writer.commit()).rejects.toThrow("Already committed");
    });

    // Dependency failures

    it("rolls back all operations when any conditional check fails", async () => {
      // Arrange

      // Existing row at current version
      const existingTransaction = fakeTransaction();
      await transactionRepository.create(existingTransaction);

      // New row to create alongside failing update
      const newTransaction = fakeTransaction();

      // Stale copy with outdated expected version to force conditional failure
      const stale = {
        ...existingTransaction,
        version: existingTransaction.version - 1,
      };

      writer.appendCreateTransaction(newTransaction);
      writer.appendUpdateTransaction(stale);

      // Act & Assert
      await expect(writer.commit()).rejects.toThrow();

      const shouldBeMissing = await transactionRepository.findOneById({
        id: newTransaction.id,
        userId: newTransaction.userId,
      });
      expect(shouldBeMissing).toBeNull();

      const storedExisting = await transactionRepository.findOneById({
        id: existingTransaction.id,
        userId: existingTransaction.userId,
      });
      expect(storedExisting).toEqual(existingTransaction);
    });
  });
});
