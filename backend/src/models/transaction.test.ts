import { faker } from "@faker-js/faker";
import { describe, expect, it } from "@jest/globals";
import { toDateString } from "../types/date";
import { fakeAccount } from "../utils/test-utils/models/account-fakes";
import { fakeCategory } from "../utils/test-utils/models/category-fakes";
import {
  fakeCreateTransactionInput,
  fakeTransaction,
} from "../utils/test-utils/models/transaction-fakes";
import { CategoryType } from "./category";
import { ModelError } from "./model-error";
import {
  DESCRIPTION_MAX_LENGTH,
  Transaction,
  TransactionType,
} from "./transaction";

describe("Transaction", () => {
  describe("create", () => {
    const fixedClock = () => new Date("2000-01-02T10:11:12.000Z");
    const fixedIdGenerator = () => "fixed-uuid";
    const fixedDeps = { clock: fixedClock, idGenerator: fixedIdGenerator };

    // Happy path

    it("builds transaction with all fields populated", () => {
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
      const result = Transaction.create(input, fixedDeps);

      // Assert
      expect(result.toData()).toEqual({
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
        version: 0,
        createdAt: "2000-01-02T10:11:12.000Z",
        updatedAt: "2000-01-02T10:11:12.000Z",
      });
    });

    it("builds transaction without category", () => {
      // Act
      const result = Transaction.create(
        fakeCreateTransactionInput({ category: undefined }),
        fixedDeps,
      );

      // Assert
      expect(result.categoryId).toBeUndefined();
    });

    it("derives currency from account", () => {
      // Arrange
      const account = fakeAccount({ currency: "GBP" });

      // Act
      const result = Transaction.create(
        fakeCreateTransactionInput({ userId: account.userId, account }),
        fixedDeps,
      );

      // Assert
      expect(result.currency).toBe("GBP");
    });

    it("trims description", () => {
      // Act
      const result = Transaction.create(
        fakeCreateTransactionInput({ description: "  spaced  " }),
        fixedDeps,
      );

      // Assert
      expect(result.description).toBe("spaced");
    });

    it("accepts whitespace-padded description within limit after trim", () => {
      // Arrange
      const withinLimit = "x".repeat(DESCRIPTION_MAX_LENGTH);
      const padded = `  ${withinLimit}  `;

      // Act
      const result = Transaction.create(
        fakeCreateTransactionInput({ description: padded }),
        fixedDeps,
      );

      // Assert
      expect(result.description).toBe(withinLimit);
    });

    it("sets description to undefined when empty after trim", () => {
      // Act
      const result = Transaction.create(
        fakeCreateTransactionInput({ description: "   " }),
        fixedDeps,
      );

      // Assert
      expect(result.description).toBeUndefined();
    });

    it("sets id and timestamps with default dependencies", () => {
      // Act
      const result = Transaction.create(fakeCreateTransactionInput());

      // Assert
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it("builds REFUND transaction with EXPENSE category", () => {
      // Arrange
      const userId = faker.string.uuid();
      const account = fakeAccount({ userId });
      const category = fakeCategory({ userId, type: CategoryType.EXPENSE });

      // Act
      const result = Transaction.create(
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

    it("builds TRANSFER_OUT transaction with transferId", () => {
      // Arrange
      const transferId = faker.string.uuid();

      // Act
      const result = Transaction.create(
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

    it("builds TRANSFER_IN transaction with transferId", () => {
      // Arrange
      const transferId = faker.string.uuid();

      // Act
      const result = Transaction.create(
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

    it("throws when account belongs to different user", () => {
      // Arrange
      const account = fakeAccount({ userId: faker.string.uuid() });

      // Act & Assert
      expect(() =>
        Transaction.create(
          fakeCreateTransactionInput({
            userId: faker.string.uuid(),
            account,
          }),
          fixedDeps,
        ),
      ).toThrow(new ModelError("Account does not belong to user"));
    });

    it("throws when account is archived", () => {
      // Arrange
      const userId = faker.string.uuid();
      const account = fakeAccount({ userId, isArchived: true });

      // Act & Assert
      expect(() =>
        Transaction.create(
          fakeCreateTransactionInput({ userId, account }),
          fixedDeps,
        ),
      ).toThrow(new ModelError("Account must not be archived"));
    });

    it("throws on zero amount", () => {
      // Act & Assert
      expect(() =>
        Transaction.create(
          fakeCreateTransactionInput({ amount: 0 }),
          fixedDeps,
        ),
      ).toThrow(new ModelError("Amount must be positive"));
    });

    it("throws on negative amount", () => {
      // Act & Assert
      expect(() =>
        Transaction.create(
          fakeCreateTransactionInput({ amount: -5 }),
          fixedDeps,
        ),
      ).toThrow(new ModelError("Amount must be positive"));
    });

    it("throws when category belongs to different user", () => {
      // Arrange
      const userId = faker.string.uuid();
      const category = fakeCategory({
        userId: faker.string.uuid(),
        type: CategoryType.EXPENSE,
      });

      // Act & Assert
      expect(() =>
        Transaction.create(
          fakeCreateTransactionInput({ userId, category }),
          fixedDeps,
        ),
      ).toThrow(new ModelError("Category does not belong to user"));
    });

    it("throws when category is archived", () => {
      // Arrange
      const userId = faker.string.uuid();
      const category = fakeCategory({
        userId,
        type: CategoryType.EXPENSE,
        isArchived: true,
      });

      // Act & Assert
      expect(() =>
        Transaction.create(
          fakeCreateTransactionInput({ userId, category }),
          fixedDeps,
        ),
      ).toThrow(new ModelError("Category must not be archived"));
    });

    it("throws on INCOME category for EXPENSE transaction", () => {
      // Arrange
      const userId = faker.string.uuid();
      const category = fakeCategory({ userId, type: CategoryType.INCOME });

      // Act & Assert
      expect(() =>
        Transaction.create(
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

    it("throws on EXPENSE category for INCOME transaction", () => {
      // Arrange
      const userId = faker.string.uuid();
      const category = fakeCategory({ userId, type: CategoryType.EXPENSE });

      // Act & Assert
      expect(() =>
        Transaction.create(
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

    it("throws when description exceeds maximum length", () => {
      // Arrange
      const tooLong = "x".repeat(DESCRIPTION_MAX_LENGTH + 1);

      // Act & Assert
      expect(() =>
        Transaction.create(
          fakeCreateTransactionInput({ description: tooLong }),
          fixedDeps,
        ),
      ).toThrow(
        new ModelError(
          `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`,
        ),
      );
    });

    it("throws on transfer with category", () => {
      // Arrange
      const userId = faker.string.uuid();
      const account = fakeAccount({ userId });
      const category = fakeCategory({ userId, type: CategoryType.EXPENSE });

      // Act & Assert
      expect(() =>
        Transaction.create(
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

    it("throws on transfer without transferId", () => {
      // Act & Assert
      expect(() =>
        Transaction.create(
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

    it("throws on non-transfer with transferId", () => {
      // Act & Assert
      expect(() =>
        Transaction.create(
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

  describe("fromPersistence", () => {
    // Happy path

    it("reconstructs instance from data", () => {
      // Arrange
      const data = fakeTransaction().toData();

      // Act
      const result = Transaction.fromPersistence(data);

      // Assert
      expect(result.toData()).toEqual(data);
    });

    // Validation failures

    it("throws on zero amount", () => {
      // Arrange
      const data = { ...fakeTransaction().toData(), amount: 0 };

      // Act & Assert
      expect(() => Transaction.fromPersistence(data)).toThrow(
        new ModelError("Amount must be positive"),
      );
    });

    it("throws when transfer has categoryId", () => {
      // Arrange
      const data = {
        ...fakeTransaction({ type: TransactionType.TRANSFER_OUT }).toData(),
        categoryId: faker.string.uuid(),
      };

      // Act & Assert
      expect(() => Transaction.fromPersistence(data)).toThrow(
        new ModelError("Transfer transactions cannot have a category"),
      );
    });
  });

  describe("signedAmount", () => {
    // Happy path

    it("returns positive amount for INCOME transactions", () => {
      // Arrange
      const tx = fakeTransaction({
        type: TransactionType.INCOME,
        amount: 100,
      });

      // Act & Assert
      expect(tx.signedAmount).toBe(100);
    });

    it("returns positive amount for REFUND transactions", () => {
      // Arrange
      const tx = fakeTransaction({
        type: TransactionType.REFUND,
        amount: 100,
      });

      // Act & Assert
      expect(tx.signedAmount).toBe(100);
    });

    it("returns positive amount for TRANSFER_IN transactions", () => {
      // Arrange
      const tx = fakeTransaction({
        type: TransactionType.TRANSFER_IN,
        amount: 100,
      });

      // Act & Assert
      expect(tx.signedAmount).toBe(100);
    });

    it("returns negative amount for EXPENSE transactions", () => {
      // Arrange
      const tx = fakeTransaction({
        type: TransactionType.EXPENSE,
        amount: 100,
      });

      // Act & Assert
      expect(tx.signedAmount).toBe(-100);
    });

    it("returns negative amount for TRANSFER_OUT transactions", () => {
      // Arrange
      const tx = fakeTransaction({
        type: TransactionType.TRANSFER_OUT,
        amount: 100,
      });

      // Act & Assert
      expect(tx.signedAmount).toBe(-100);
    });
  });

  describe("toData", () => {
    // Happy path

    it("returns plain object with all data fields", () => {
      // Arrange
      const data = fakeTransaction().toData();
      const tx = Transaction.fromPersistence(data);

      // Act & Assert
      expect(tx.toData()).toEqual(data);
    });
  });

  describe("bumpVersion", () => {
    // Happy path

    it("increments version by 1", () => {
      // Arrange
      const existing = fakeTransaction({ version: 4 });

      // Act
      const result = existing.bumpVersion();

      // Assert
      expect(result.version).toBe(5);
    });

    it("preserves all other fields", () => {
      // Arrange
      const existing = fakeTransaction();

      // Act
      const result = existing.bumpVersion();

      // Assert
      expect(result.toData()).toEqual({
        ...existing.toData(),
        version: existing.version + 1,
      });
    });
  });

  describe("update", () => {
    // Happy path

    it("sets amount", () => {
      // Arrange
      const existing = fakeTransaction({ amount: 10 });

      // Act
      const result = existing.update({ amount: 20 });

      // Assert
      expect(result.amount).toEqual(20);
    });

    it("sets account and derives currency from new account", () => {
      // Arrange
      const userId = faker.string.uuid();
      const existing = fakeTransaction({ userId, currency: "USD" });
      const newAccount = fakeAccount({ userId, currency: "EUR" });

      // Act
      const result = existing.update({ account: newAccount });

      // Assert
      expect(result.accountId).toBe(newAccount.id);
      expect(result.currency).toBe("EUR");
    });

    it("keeps account and currency when input is undefined", () => {
      // Arrange
      const existing = fakeTransaction({ currency: "GBP" });

      // Act
      const result = existing.update({ account: undefined, amount: 1 });

      // Assert
      expect(result.accountId).toBe(existing.accountId);
      expect(result.currency).toBe("GBP");
    });

    it("sets category", () => {
      // Arrange
      const userId = faker.string.uuid();
      const existing = fakeTransaction({ userId, categoryId: undefined });
      const newCategory = fakeCategory({ userId, type: CategoryType.EXPENSE });

      // Act
      const result = existing.update({ category: newCategory });

      // Assert
      expect(result.categoryId).toBe(newCategory.id);
    });

    it("clears category when input is null", () => {
      // Arrange
      const existing = fakeTransaction({ categoryId: faker.string.uuid() });

      // Act
      const result = existing.update({ category: null });

      // Assert
      expect(result.categoryId).toBeUndefined();
    });

    it("keeps category when input is undefined", () => {
      // Arrange
      const existing = fakeTransaction({ categoryId: "existing-category" });

      // Act
      const result = existing.update({ category: undefined, amount: 1 });

      // Assert
      expect(result.categoryId).toBe("existing-category");
    });

    it("trims description", () => {
      // Arrange
      const existing = fakeTransaction({ description: "old" });

      // Act
      const result = existing.update({ description: "  new  " });

      // Assert
      expect(result.description).toBe("new");
    });

    it("clears description when input is null", () => {
      // Arrange
      const existing = fakeTransaction({ description: "old" });

      // Act
      const result = existing.update({ description: null });

      // Assert
      expect(result.description).toBeUndefined();
    });

    it("keeps description when input is undefined", () => {
      // Arrange
      const existing = fakeTransaction({ description: "keep me" });

      // Act
      const result = existing.update({ description: undefined, amount: 1 });

      // Assert
      expect(result.description).toBe("keep me");
    });

    it("preserves id, userId, transferId, isArchived, createdAt", () => {
      // Arrange
      const existing = fakeTransaction({
        id: "id-1",
        userId: "user-1",
        type: TransactionType.TRANSFER_OUT,
        categoryId: undefined,
        transferId: "transfer-1",
        createdAt: "1999-01-01T00:00:00.000Z",
      });

      // Act
      const result = existing.update({ amount: 1 });

      // Assert
      expect(result.id).toBe("id-1");
      expect(result.userId).toBe("user-1");
      expect(result.transferId).toBe("transfer-1");
      expect(result.isArchived).toBe(false);
      expect(result.createdAt).toBe("1999-01-01T00:00:00.000Z");
    });

    it("sets updatedAt", () => {
      const fixedClock = () => new Date("2000-01-02T10:11:12.000Z");
      const fixedDeps = { clock: fixedClock };

      // Arrange
      const existing = fakeTransaction();

      // Act
      const result = existing.update({ amount: 1 }, fixedDeps);

      // Assert
      expect(result.updatedAt).toBe("2000-01-02T10:11:12.000Z");
    });

    it("uses default clock when options omitted", () => {
      // Arrange
      const existing = fakeTransaction();

      // Act
      const result = existing.update({ amount: 1 });

      // Assert
      expect(result.updatedAt).toBeDefined();
    });

    // Validation failures

    it("throws on updating archived transaction", () => {
      // Arrange
      const existing = fakeTransaction({ isArchived: true });

      // Act & Assert
      expect(() => existing.update({ amount: 5 })).toThrow(
        new ModelError("Cannot update archived transaction"),
      );
    });

    it("throws on zero amount", () => {
      // Arrange
      const existing = fakeTransaction();

      // Act & Assert
      expect(() => existing.update({ amount: 0 })).toThrow(
        new ModelError("Amount must be positive"),
      );
    });

    it("throws on negative amount", () => {
      // Arrange
      const existing = fakeTransaction();

      // Act & Assert
      expect(() => existing.update({ amount: -1 })).toThrow(
        new ModelError("Amount must be positive"),
      );
    });

    it("throws when account belongs to different user", () => {
      // Arrange
      const existing = fakeTransaction({ userId: "user-a" });
      const account = fakeAccount({ userId: "user-b" });

      // Act & Assert
      expect(() => existing.update({ account })).toThrow(
        new ModelError("Account does not belong to user"),
      );
    });

    it("throws on archived account", () => {
      // Arrange
      const userId = faker.string.uuid();
      const existing = fakeTransaction({ userId });
      const account = fakeAccount({ userId, isArchived: true });

      // Act & Assert
      expect(() => existing.update({ account })).toThrow(
        new ModelError("Account must not be archived"),
      );
    });

    it("throws when category belongs to different user", () => {
      // Arrange
      const existing = fakeTransaction({ userId: "user-a" });
      const category = fakeCategory({
        userId: "user-b",
        type: CategoryType.EXPENSE,
      });

      // Act & Assert
      expect(() => existing.update({ category })).toThrow(
        new ModelError("Category does not belong to user"),
      );
    });

    it("throws on archived category", () => {
      // Arrange
      const userId = faker.string.uuid();
      const existing = fakeTransaction({ userId });
      const category = fakeCategory({
        userId,
        type: CategoryType.EXPENSE,
        isArchived: true,
      });

      // Act & Assert
      expect(() => existing.update({ category })).toThrow(
        new ModelError("Category must not be archived"),
      );
    });

    it("throws on INCOME category for EXPENSE transaction", () => {
      // Arrange
      const userId = faker.string.uuid();
      const existing = fakeTransaction({
        userId,
        type: TransactionType.EXPENSE,
      });
      const category = fakeCategory({ userId, type: CategoryType.INCOME });

      // Act & Assert
      expect(() => existing.update({ category })).toThrow(
        new ModelError("Category type does not match transaction type"),
      );
    });

    it("throws when setting category on transfer transaction", () => {
      // Arrange
      const userId = faker.string.uuid();
      const existing = fakeTransaction({
        userId,
        type: TransactionType.TRANSFER_OUT,
        categoryId: undefined,
        transferId: faker.string.uuid(),
      });
      const category = fakeCategory({ userId, type: CategoryType.EXPENSE });

      // Act & Assert
      expect(() => existing.update({ category })).toThrow(
        new ModelError("Transfer transactions cannot have a category"),
      );
    });

    it("throws when description exceeds maximum length", () => {
      // Arrange
      const existing = fakeTransaction();
      const tooLong = "x".repeat(DESCRIPTION_MAX_LENGTH + 1);

      // Act & Assert
      expect(() => existing.update({ description: tooLong })).toThrow(
        new ModelError(
          `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`,
        ),
      );
    });

    it("throws on switching non-transfer to transfer type", () => {
      // Arrange
      const existing = fakeTransaction({
        type: TransactionType.EXPENSE,
        categoryId: undefined,
        transferId: undefined,
      });

      // Act & Assert
      expect(() =>
        existing.update({ type: TransactionType.TRANSFER_OUT }),
      ).toThrow(
        new ModelError("Transfer transactions must include transferId"),
      );
    });

    it("throws when switching to transfer type without clearing category", () => {
      // Arrange — existing transaction has categoryId; switching type to
      // transfer surfaces the category invariant first
      const existing = fakeTransaction({ type: TransactionType.EXPENSE });

      // Act & Assert
      expect(() =>
        existing.update({ type: TransactionType.TRANSFER_OUT }),
      ).toThrow(new ModelError("Transfer transactions cannot have a category"));
    });

    it("throws on switching transfer to non-transfer type", () => {
      // Arrange
      const existing = fakeTransaction({
        type: TransactionType.TRANSFER_OUT,
        categoryId: undefined,
        transferId: faker.string.uuid(),
      });

      // Act & Assert
      expect(() => existing.update({ type: TransactionType.EXPENSE })).toThrow(
        new ModelError("Only transfer transactions can include transferId"),
      );
    });
  });

  describe("archive", () => {
    // Happy path

    it("sets isArchived to true", () => {
      // Arrange
      const existing = fakeTransaction();

      // Act
      const result = existing.archive();

      // Assert
      expect(result.isArchived).toBe(true);
    });

    it("sets updatedAt", () => {
      // Arrange
      const fixedClock = () => new Date("2000-01-02T10:11:12.000Z");
      const existing = fakeTransaction();

      // Act
      const result = existing.archive({ clock: fixedClock });

      // Assert
      expect(result.updatedAt).toBe("2000-01-02T10:11:12.000Z");
    });

    it("uses default clock when options omitted", () => {
      // Arrange
      const existing = fakeTransaction();

      // Act
      const result = existing.archive();

      // Assert
      expect(result.updatedAt).toBeDefined();
    });

    // Validation failures

    it("throws on already archived transaction", () => {
      // Arrange
      const existing = fakeTransaction({ isArchived: true });

      // Act & Assert
      expect(() => existing.archive()).toThrow(
        new ModelError("Cannot archive archived transaction"),
      );
    });
  });
});
