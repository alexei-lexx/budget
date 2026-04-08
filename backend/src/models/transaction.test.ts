import { faker } from "@faker-js/faker";
import { describe, expect, it } from "@jest/globals";
import { fakeTransaction } from "../utils/test-utils/models/transaction-fakes";
import { Transaction, TransactionType } from "./transaction";

describe("transaction model", () => {
  describe("signedAmount", () => {
    it("should return positive amount for INCOME transactions", () => {
      const transaction = fakeTransaction({
        type: TransactionType.INCOME,
        amount: 100,
      });
      expect(transaction.signedAmount).toBe(100);
    });

    it("should return positive amount for REFUND transactions", () => {
      const transaction = fakeTransaction({
        type: TransactionType.REFUND,
        amount: 100,
      });
      expect(transaction.signedAmount).toBe(100);
    });

    it("should return positive amount for TRANSFER_IN transactions", () => {
      const transaction = fakeTransaction({
        type: TransactionType.TRANSFER_IN,
        amount: 100,
        transferId: faker.string.uuid(),
      });
      expect(transaction.signedAmount).toBe(100);
    });

    it("should return negative amount for EXPENSE transactions", () => {
      const transaction = fakeTransaction({
        type: TransactionType.EXPENSE,
        amount: 100,
      });
      expect(transaction.signedAmount).toBe(-100);
    });

    it("should return negative amount for TRANSFER_OUT transactions", () => {
      const transaction = fakeTransaction({
        type: TransactionType.TRANSFER_OUT,
        amount: 100,
        transferId: faker.string.uuid(),
      });
      expect(transaction.signedAmount).toBe(-100);
    });
  });

  describe("isTransfer", () => {
    it("should return true for TRANSFER_IN", () => {
      const transaction = fakeTransaction({
        type: TransactionType.TRANSFER_IN,
        transferId: "some-transfer-id",
      });
      expect(transaction.isTransfer()).toBe(true);
    });

    it("should return true for TRANSFER_OUT", () => {
      const transaction = fakeTransaction({
        type: TransactionType.TRANSFER_OUT,
        transferId: "some-transfer-id",
      });
      expect(transaction.isTransfer()).toBe(true);
    });

    it("should return false for INCOME", () => {
      const transaction = fakeTransaction({ type: TransactionType.INCOME });
      expect(transaction.isTransfer()).toBe(false);
    });

    it("should return false for EXPENSE", () => {
      const transaction = fakeTransaction({ type: TransactionType.EXPENSE });
      expect(transaction.isTransfer()).toBe(false);
    });

    it("should return false for REFUND", () => {
      const transaction = fakeTransaction({ type: TransactionType.REFUND });
      expect(transaction.isTransfer()).toBe(false);
    });
  });

  describe("Transaction.build", () => {
    it("should throw when TRANSFER_IN has no transferId", () => {
      expect(() =>
        Transaction.build(
          fakeTransaction({ type: TransactionType.TRANSFER_IN }),
        ),
      ).toThrow("transferId is required for TRANSFER_IN");
    });

    it("should throw when TRANSFER_OUT has no transferId", () => {
      expect(() =>
        Transaction.build(
          fakeTransaction({ type: TransactionType.TRANSFER_OUT }),
        ),
      ).toThrow("transferId is required for TRANSFER_OUT");
    });

    it("should throw when non-transfer type has transferId", () => {
      expect(() =>
        Transaction.build(
          fakeTransaction({
            type: TransactionType.EXPENSE,
            transferId: "some-transfer-id",
          }),
        ),
      ).toThrow("transferId must not be set for EXPENSE");
    });

    it("should succeed for TRANSFER_IN with transferId", () => {
      expect(() =>
        Transaction.build(
          fakeTransaction({
            type: TransactionType.TRANSFER_IN,
            transferId: "some-transfer-id",
          }),
        ),
      ).not.toThrow();
    });

    it("should succeed for EXPENSE without transferId", () => {
      expect(() =>
        Transaction.build(
          fakeTransaction({
            type: TransactionType.EXPENSE,
            transferId: undefined,
          }),
        ),
      ).not.toThrow();
    });
  });
});
