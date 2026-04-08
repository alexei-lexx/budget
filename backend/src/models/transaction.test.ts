import { faker } from "@faker-js/faker";
import { describe, expect, it } from "@jest/globals";
import {
  fakeTransaction,
  fakeTransactionData,
} from "../utils/test-utils/models/transaction-fakes";
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

    it("should throw error for unknown transaction type", () => {
      const transaction = fakeTransaction({
        type: "UNKNOWN" as TransactionType,
      });
      expect(() => transaction.signedAmount).toThrow(
        "Unknown transaction type: UNKNOWN",
      );
    });
  });

  describe("Transaction.build", () => {
    it("should throw when TRANSFER_IN has no transferId", () => {
      expect(() =>
        Transaction.build(
          fakeTransactionData({
            transferId: undefined,
            type: TransactionType.TRANSFER_IN,
          }),
        ),
      ).toThrow("transferId is required for TRANSFER_IN");
    });

    it("should throw when TRANSFER_OUT has no transferId", () => {
      expect(() =>
        Transaction.build(
          fakeTransactionData({
            transferId: undefined,
            type: TransactionType.TRANSFER_OUT,
          }),
        ),
      ).toThrow("transferId is required for TRANSFER_OUT");
    });

    it("should throw when non-transfer type has transferId", () => {
      expect(() =>
        Transaction.build(
          fakeTransactionData({
            transferId: "some-transfer-id",
            type: TransactionType.EXPENSE,
          }),
        ),
      ).toThrow("transferId must not be set for EXPENSE");
    });

    it("should succeed for TRANSFER_IN with transferId", () => {
      expect(() =>
        Transaction.build(
          fakeTransactionData({
            transferId: "some-transfer-id",
            type: TransactionType.TRANSFER_IN,
          }),
        ),
      ).not.toThrow();
    });

    it("should succeed for EXPENSE without transferId", () => {
      expect(() =>
        Transaction.build(
          fakeTransactionData({
            transferId: undefined,
            type: TransactionType.EXPENSE,
          }),
        ),
      ).not.toThrow();
    });
  });
});
