import { describe, expect, it } from "@jest/globals";
import { fakeTransaction } from "../utils/test-utils/factories";
import { TransactionType, getSignedAmount } from "./transaction";

describe("transaction model", () => {
  describe("getSignedAmount", () => {
    it("should return positive amount for INCOME transactions", () => {
      const transaction = fakeTransaction({
        type: TransactionType.INCOME,
        amount: 100,
      });
      expect(getSignedAmount(transaction)).toBe(100);
    });

    it("should return positive amount for REFUND transactions", () => {
      const transaction = fakeTransaction({
        type: TransactionType.REFUND,
        amount: 100,
      });
      expect(getSignedAmount(transaction)).toBe(100);
    });

    it("should return positive amount for TRANSFER_IN transactions", () => {
      const transaction = fakeTransaction({
        type: TransactionType.TRANSFER_IN,
        amount: 100,
      });
      expect(getSignedAmount(transaction)).toBe(100);
    });

    it("should return negative amount for EXPENSE transactions", () => {
      const transaction = fakeTransaction({
        type: TransactionType.EXPENSE,
        amount: 100,
      });
      expect(getSignedAmount(transaction)).toBe(-100);
    });

    it("should return negative amount for TRANSFER_OUT transactions", () => {
      const transaction = fakeTransaction({
        type: TransactionType.TRANSFER_OUT,
        amount: 100,
      });
      expect(getSignedAmount(transaction)).toBe(-100);
    });

    it("should throw error for unknown transaction type", () => {
      const transaction = fakeTransaction({
        type: "UNKNOWN" as TransactionType,
      });
      expect(() => getSignedAmount(transaction)).toThrow(
        "Unknown transaction type: UNKNOWN",
      );
    });
  });
});
