import { faker } from "@faker-js/faker";
import { describe, expect, it } from "@jest/globals";
import { toDateString } from "../types/date";
import { DESCRIPTION_MAX_LENGTH } from "../types/validation";
import { fakeAccount } from "../utils/test-utils/models/account-fakes";
import { fakeCategory } from "../utils/test-utils/models/category-fakes";
import {
  fakeCreateTransactionInput,
  fakeTransaction,
} from "../utils/test-utils/models/transaction-fakes";
import { CategoryType } from "./category";
import { ModelError } from "./model-error";
import {
  TransactionType,
  createTransactionModel,
  getSignedAmount,
} from "./transaction";

describe("transaction model", () => {
  describe("createTransactionModel", () => {
    const fixedClock = () => new Date("2000-01-02T10:11:12.000Z");
    const fixedIdGenerator = () => "fixed-uuid";
    const fixedDeps = { clock: fixedClock, idGenerator: fixedIdGenerator };

    // Happy path

    it("should build transaction with all fields populated", () => {
      // Arrange
      const userId = faker.string.uuid();
      const account = fakeAccount({ userId, currency: "EUR" });
      const category = fakeCategory({ userId, type: CategoryType.EXPENSE });
      const input = fakeCreateTransactionInput({
        userId,
        account,
        category,
        type: TransactionType.EXPENSE,
        amount: 42.5,
        date: toDateString("2000-01-02"),
        description: "lunch",
      });

      // Act
      const result = createTransactionModel(input, fixedDeps);

      // Assert
      expect(result).toEqual({
        id: "fixed-uuid",
        userId,
        accountId: account.id,
        categoryId: category.id,
        type: TransactionType.EXPENSE,
        amount: 42.5,
        currency: "EUR",
        date: "2000-01-02",
        description: "lunch",
        transferId: undefined,
        isArchived: false,
        createdAt: "2000-01-02T10:11:12.000Z",
        updatedAt: "2000-01-02T10:11:12.000Z",
      });
    });

    it("should build transaction without category", () => {
      // Act
      const result = createTransactionModel(
        fakeCreateTransactionInput({ category: undefined }),
        fixedDeps,
      );

      // Assert
      expect(result.categoryId).toBeUndefined();
    });

    it("should derive currency from account", () => {
      // Arrange
      const account = fakeAccount({ currency: "GBP" });

      // Act
      const result = createTransactionModel(
        fakeCreateTransactionInput({ userId: account.userId, account }),
        fixedDeps,
      );

      // Assert
      expect(result.currency).toBe("GBP");
    });

    it("should trim description", () => {
      // Act
      const result = createTransactionModel(
        fakeCreateTransactionInput({ description: "  spaced  " }),
        fixedDeps,
      );

      // Assert
      expect(result.description).toBe("spaced");
    });

    it("should accept whitespace-padded description within limit after trim", () => {
      // Arrange
      const withinLimit = "x".repeat(DESCRIPTION_MAX_LENGTH);
      const padded = `  ${withinLimit}  `;

      // Act
      const result = createTransactionModel(
        fakeCreateTransactionInput({ description: padded }),
        fixedDeps,
      );

      // Assert
      expect(result.description).toBe(withinLimit);
    });

    it("should set description to undefined when empty after trim", () => {
      // Act
      const result = createTransactionModel(
        fakeCreateTransactionInput({ description: "   " }),
        fixedDeps,
      );

      // Assert
      expect(result.description).toBeUndefined();
    });

    it("should default isArchived to false", () => {
      // Act
      const result = createTransactionModel(
        fakeCreateTransactionInput(),
        fixedDeps,
      );

      // Assert
      expect(result.isArchived).toBe(false);
    });

    it("should set createdAt equal to updatedAt", () => {
      // Act
      const result = createTransactionModel(
        fakeCreateTransactionInput(),
        fixedDeps,
      );

      // Assert
      expect(result.createdAt).toBe(result.updatedAt);
    });

    it("should set id and timestamps with default dependencies", () => {
      // Act
      const result = createTransactionModel(fakeCreateTransactionInput());

      // Assert
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it("should build REFUND transaction with EXPENSE category", () => {
      // Arrange
      const userId = faker.string.uuid();
      const account = fakeAccount({ userId });
      const category = fakeCategory({ userId, type: CategoryType.EXPENSE });

      // Act
      const result = createTransactionModel(
        fakeCreateTransactionInput({
          userId,
          account,
          category,
          type: TransactionType.REFUND,
        }),
        fixedDeps,
      );

      // Assert
      expect(result.type).toBe(TransactionType.REFUND);
      expect(result.categoryId).toBe(category.id);
    });

    it("should build TRANSFER_OUT transaction with transferId", () => {
      // Arrange
      const transferId = faker.string.uuid();

      // Act
      const result = createTransactionModel(
        fakeCreateTransactionInput({
          type: TransactionType.TRANSFER_OUT,
          transferId,
        }),
        fixedDeps,
      );

      // Assert
      expect(result.type).toBe(TransactionType.TRANSFER_OUT);
      expect(result.transferId).toBe(transferId);
      expect(result.categoryId).toBeUndefined();
    });

    it("should build TRANSFER_IN transaction with transferId", () => {
      // Arrange
      const transferId = faker.string.uuid();

      // Act
      const result = createTransactionModel(
        fakeCreateTransactionInput({
          type: TransactionType.TRANSFER_IN,
          transferId,
        }),
        fixedDeps,
      );

      // Assert
      expect(result.type).toBe(TransactionType.TRANSFER_IN);
      expect(result.transferId).toBe(transferId);
    });

    // Validation failures

    it("should reject when account belongs to different user", () => {
      // Arrange
      const account = fakeAccount({ userId: faker.string.uuid() });

      // Act & Assert
      expect(() =>
        createTransactionModel(
          fakeCreateTransactionInput({
            userId: faker.string.uuid(),
            account,
          }),
          fixedDeps,
        ),
      ).toThrow(new ModelError("Account does not belong to user"));
    });

    it("should reject when account is archived", () => {
      // Arrange
      const userId = faker.string.uuid();
      const account = fakeAccount({ userId, isArchived: true });

      // Act & Assert
      expect(() =>
        createTransactionModel(
          fakeCreateTransactionInput({ userId, account }),
          fixedDeps,
        ),
      ).toThrow(
        new ModelError("Cannot create transaction for archived account"),
      );
    });

    it("should reject zero amount", () => {
      // Act & Assert
      expect(() =>
        createTransactionModel(
          fakeCreateTransactionInput({ amount: 0 }),
          fixedDeps,
        ),
      ).toThrow(new ModelError("Transaction amount must be positive"));
    });

    it("should reject negative amount", () => {
      // Act & Assert
      expect(() =>
        createTransactionModel(
          fakeCreateTransactionInput({ amount: -5 }),
          fixedDeps,
        ),
      ).toThrow(new ModelError("Transaction amount must be positive"));
    });

    it("should reject when category belongs to different user", () => {
      // Arrange
      const userId = faker.string.uuid();
      const category = fakeCategory({
        userId: faker.string.uuid(),
        type: CategoryType.EXPENSE,
      });

      // Act & Assert
      expect(() =>
        createTransactionModel(
          fakeCreateTransactionInput({ userId, category }),
          fixedDeps,
        ),
      ).toThrow(new ModelError("Category does not belong to user"));
    });

    it("should reject when category is archived", () => {
      // Arrange
      const userId = faker.string.uuid();
      const category = fakeCategory({
        userId,
        type: CategoryType.EXPENSE,
        isArchived: true,
      });

      // Act & Assert
      expect(() =>
        createTransactionModel(
          fakeCreateTransactionInput({ userId, category }),
          fixedDeps,
        ),
      ).toThrow(
        new ModelError("Cannot create transaction for archived category"),
      );
    });

    it("should reject INCOME category on EXPENSE transaction", () => {
      // Arrange
      const userId = faker.string.uuid();
      const category = fakeCategory({ userId, type: CategoryType.INCOME });

      // Act & Assert
      expect(() =>
        createTransactionModel(
          fakeCreateTransactionInput({
            userId,
            category,
            type: TransactionType.EXPENSE,
          }),
          fixedDeps,
        ),
      ).toThrow(
        new ModelError("Category type does not match transaction type"),
      );
    });

    it("should reject EXPENSE category on INCOME transaction", () => {
      // Arrange
      const userId = faker.string.uuid();
      const category = fakeCategory({ userId, type: CategoryType.EXPENSE });

      // Act & Assert
      expect(() =>
        createTransactionModel(
          fakeCreateTransactionInput({
            userId,
            category,
            type: TransactionType.INCOME,
          }),
          fixedDeps,
        ),
      ).toThrow(
        new ModelError("Category type does not match transaction type"),
      );
    });

    it("should reject description exceeding max length", () => {
      // Arrange
      const tooLong = "x".repeat(DESCRIPTION_MAX_LENGTH + 1);

      // Act & Assert
      expect(() =>
        createTransactionModel(
          fakeCreateTransactionInput({ description: tooLong }),
          fixedDeps,
        ),
      ).toThrow(
        new ModelError(
          `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`,
        ),
      );
    });

    it("should reject transfer with category", () => {
      // Arrange
      const userId = faker.string.uuid();
      const account = fakeAccount({ userId });
      const category = fakeCategory({ userId, type: CategoryType.EXPENSE });

      // Act & Assert
      expect(() =>
        createTransactionModel(
          fakeCreateTransactionInput({
            userId,
            account,
            category,
            type: TransactionType.TRANSFER_OUT,
            transferId: faker.string.uuid(),
          }),
          fixedDeps,
        ),
      ).toThrow(new ModelError("Transfer transactions cannot have a category"));
    });

    it("should reject transfer without transferId", () => {
      // Act & Assert
      expect(() =>
        createTransactionModel(
          fakeCreateTransactionInput({
            type: TransactionType.TRANSFER_OUT,
            transferId: undefined,
          }),
          fixedDeps,
        ),
      ).toThrow(
        new ModelError("Transfer transactions must include transferId"),
      );
    });

    it("should reject non-transfer with transferId", () => {
      // Act & Assert
      expect(() =>
        createTransactionModel(
          fakeCreateTransactionInput({
            type: TransactionType.EXPENSE,
            transferId: faker.string.uuid(),
          }),
          fixedDeps,
        ),
      ).toThrow(
        new ModelError("Only transfer transactions can include transferId"),
      );
    });
  });

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
