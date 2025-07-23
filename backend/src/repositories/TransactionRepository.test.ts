import { TransactionRepository } from "./TransactionRepository";
import { TransactionType, CreateTransactionInput } from "../models/Transaction";

describe("TransactionRepository", () => {
  let repository: TransactionRepository;

  beforeAll(async () => {
    // Create repository instance
    repository = new TransactionRepository();
  });

  describe("create", () => {
    it("should create a transaction successfully", async () => {
      // Arrange
      const userId = "test-user-123";
      const accountId = "test-account-456";
      const input: CreateTransactionInput = {
        userId,
        accountId,
        type: TransactionType.INCOME,
        amount: 100.5,
        currency: "USD",
        date: "2024-01-15",
        description: "Test transaction",
        categoryId: "test-category-789",
      };

      // Act
      const result = await repository.create(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.accountId).toBe(accountId);
      expect(result.type).toBe(TransactionType.INCOME);
      expect(result.amount).toBe(100.5);
      expect(result.currency).toBe("USD");
      expect(result.date).toBe("2024-01-15");
      expect(result.description).toBe("Test transaction");
      expect(result.categoryId).toBe("test-category-789");
      expect(result.isArchived).toBe(false);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(result.createdAt).toBe(result.updatedAt);

      // Verify UUID format
      expect(result.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );

      // Verify ISO timestamp format
      expect(result.createdAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );

      // Refetch from database to verify stored data matches result
      const stored = await repository.findById(result.id, userId);
      expect(stored).toEqual(result);
    });

    it("should create transaction without optional fields", async () => {
      // Arrange
      const userId = "test-user-456";
      const accountId = "test-account-789";
      const input: CreateTransactionInput = {
        userId,
        accountId,
        type: TransactionType.EXPENSE,
        amount: 50.25,
        currency: "EUR",
        date: "2024-01-16",
      };

      // Act
      const result = await repository.create(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.accountId).toBe(accountId);
      expect(result.type).toBe(TransactionType.EXPENSE);
      expect(result.amount).toBe(50.25);
      expect(result.currency).toBe("EUR");
      expect(result.date).toBe("2024-01-16");
      expect(result.description).toBeUndefined();
      expect(result.categoryId).toBeUndefined();
      expect(result.transferId).toBeUndefined();
      expect(result.isArchived).toBe(false);

      // Refetch from database to verify stored data matches result
      const stored = await repository.findById(result.id, userId);
      expect(stored).toEqual(result);
    });

    it("should create transfer transaction with transferId", async () => {
      // Arrange
      const userId = "test-user-789";
      const accountId = "test-account-abc";
      const transferId = "transfer-123";
      const input: CreateTransactionInput = {
        userId,
        accountId,
        type: TransactionType.TRANSFER_OUT,
        amount: 200.0,
        currency: "GBP",
        date: "2024-01-17",
        transferId,
        description: "Transfer to savings",
      };

      // Act
      const result = await repository.create(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.transferId).toBe(transferId);
      expect(result.type).toBe(TransactionType.TRANSFER_OUT);
      expect(result.amount).toBe(200.0);
      expect(result.currency).toBe("GBP");

      // Refetch from database to verify stored data matches result
      const stored = await repository.findById(result.id, userId);
      expect(stored).toEqual(result);
    });
  });

  describe("createMany", () => {
    it("should throw error for empty input array", async () => {
      const inputs: CreateTransactionInput[] = [];

      await expect(repository.createMany(inputs)).rejects.toThrow(
        "At least one transaction input is required",
      );
    });

    it("should create multiple transactions successfully", async () => {
      const inputs: CreateTransactionInput[] = [
        {
          userId: "test-user-multi-1",
          accountId: "test-account-multi-1",
          type: TransactionType.INCOME,
          amount: 300.0,
          currency: "USD",
          date: "2024-01-18",
        },
        {
          userId: "test-user-multi-2",
          accountId: "test-account-multi-2",
          type: TransactionType.EXPENSE,
          amount: 150.0,
          currency: "EUR",
          date: "2024-01-19",
        },
      ];

      const result = await repository.createMany(inputs);

      expect(result.length).toBe(2);

      expect(result[0].userId).toBe(inputs[0].userId);
      expect(result[0].accountId).toBe(inputs[0].accountId);
      expect(result[0].type).toBe(inputs[0].type);
      expect(result[0].amount).toBe(inputs[0].amount);
      expect(result[0].currency).toBe(inputs[0].currency);
      expect(result[0].date).toBe(inputs[0].date);

      expect(result[1].userId).toBe(inputs[1].userId);
      expect(result[1].accountId).toBe(inputs[1].accountId);
      expect(result[1].type).toBe(inputs[1].type);
      expect(result[1].amount).toBe(inputs[1].amount);
      expect(result[1].currency).toBe(inputs[1].currency);
      expect(result[1].date).toBe(inputs[1].date);

      const stored1 = await repository.findById(result[0].id, inputs[0].userId);
      const stored2 = await repository.findById(result[1].id, inputs[1].userId);

      expect([stored1, stored2]).toEqual(expect.arrayContaining(result));
    });
  });

  describe("update", () => {
    it("should update all attributes successfully", async () => {
      // Arrange
      const userId = "test-user-update";
      const accountId = "test-account-update";
      const createInput: CreateTransactionInput = {
        userId,
        accountId,
        type: TransactionType.EXPENSE,
        amount: 75.0,
        currency: "USD",
        date: "2024-01-20",
        description: "Original description",
        categoryId: "test-category-original",
      };

      // Create transaction first
      const created = await repository.create(createInput);

      // Act - Update ALL possible attributes
      const updateInput = {
        accountId: "new-account-id",
        type: TransactionType.INCOME,
        amount: 100.0,
        currency: "EUR",
        date: "2024-02-01",
        description: "Updated description",
        categoryId: "test-category-updated",
      };
      const result = await repository.update(created.id, userId, updateInput);

      // Assert - All attributes updated
      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
      expect(result.userId).toBe(userId);
      expect(result.accountId).toBe("new-account-id");
      expect(result.type).toBe(TransactionType.INCOME);
      expect(result.amount).toBe(100.0);
      expect(result.currency).toBe("EUR");
      expect(result.date).toBe("2024-02-01");
      expect(result.description).toBe("Updated description");
      expect(result.categoryId).toBe("test-category-updated");
      expect(result.isArchived).toBe(false);
      expect(result.createdAt).toBe(created.createdAt);
      expect(result.updatedAt).not.toBe(created.updatedAt);

      // Refetch from database to verify stored data matches result
      const stored = await repository.findById(result.id, userId);
      expect(stored).toEqual(result);
    });

    it("should update no attributes (only updatedAt changes)", async () => {
      // Arrange
      const userId = "test-user-no-update";
      const accountId = "test-account-no-update";
      const createInput: CreateTransactionInput = {
        userId,
        accountId,
        type: TransactionType.EXPENSE,
        amount: 50.0,
        currency: "USD",
        date: "2024-01-25",
        description: "No change description",
        categoryId: "no-change-category",
      };

      // Create transaction first
      const created = await repository.create(createInput);

      // Act - Update with empty input (only updatedAt should change)
      const updateInput = {};
      const result = await repository.update(created.id, userId, updateInput);

      // Assert - All original values preserved except updatedAt
      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
      expect(result.userId).toBe(userId);
      expect(result.accountId).toBe(accountId);
      expect(result.type).toBe(TransactionType.EXPENSE);
      expect(result.amount).toBe(50.0);
      expect(result.currency).toBe("USD");
      expect(result.date).toBe("2024-01-25");
      expect(result.description).toBe("No change description");
      expect(result.categoryId).toBe("no-change-category");
      expect(result.isArchived).toBe(false);
      expect(result.createdAt).toBe(created.createdAt);
      expect(result.updatedAt).not.toBe(created.updatedAt);

      // Refetch from database to verify stored data matches result
      const stored = await repository.findById(result.id, userId);
      expect(stored).toEqual(result);
    });

    it("should overwrite with null values", async () => {
      // Arrange
      const userId = "test-user-null-update";
      const accountId = "test-account-null-update";
      const createInput: CreateTransactionInput = {
        userId,
        accountId,
        type: TransactionType.INCOME,
        amount: 200.0,
        currency: "EUR",
        date: "2024-01-21",
        description: "Test description",
        categoryId: "test-category",
      };

      // Create transaction first
      const created = await repository.create(createInput);

      // Act - Update with null values
      const updateInput = {
        description: null,
        categoryId: null,
      };
      const result = await repository.update(created.id, userId, updateInput);

      // Assert
      expect(result).toBeDefined();
      expect(result.description).toBeNull();
      expect(result.categoryId).toBeNull();

      // Refetch from database to verify stored data matches result
      const stored = await repository.findById(result.id, userId);
      expect(stored).toEqual(result);
    });

    it("should update single field (partial update)", async () => {
      // Arrange
      const userId = "test-user-partial-update";
      const accountId = "test-account-partial-update";
      const createInput: CreateTransactionInput = {
        userId,
        accountId,
        type: TransactionType.EXPENSE,
        amount: 150.0,
        currency: "GBP",
        date: "2024-01-22",
        description: "Original description",
        categoryId: "original-category",
      };

      // Create transaction first
      const created = await repository.create(createInput);

      // Act - Update single field
      const updateInput = { amount: 175.0 };
      const result = await repository.update(created.id, userId, updateInput);

      // Assert - Only amount changed, others preserved
      expect(result).toBeDefined();
      expect(result.amount).toBe(175.0);
      expect(result.description).toBe("Original description");
      expect(result.categoryId).toBe("original-category");
      expect(result.type).toBe(TransactionType.EXPENSE);
      expect(result.currency).toBe("GBP");
      expect(result.date).toBe("2024-01-22");

      // Refetch from database to verify stored data matches result
      const stored = await repository.findById(result.id, userId);
      expect(stored).toEqual(result);
    });

    it("should throw error for non-existent transaction", async () => {
      // Arrange
      const userId = "test-user-nonexistent";
      const nonExistentId = "non-existent-transaction-id";
      const updateInput = { amount: 50.0 };

      // Act & Assert
      await expect(
        repository.update(nonExistentId, userId, updateInput),
      ).rejects.toThrow("Transaction not found or is archived");
    });

    it("should throw error when trying to update archived transaction", async () => {
      // Arrange
      const userId = "test-user-archived";
      const accountId = "test-account-archived";
      const createInput: CreateTransactionInput = {
        userId,
        accountId,
        type: TransactionType.EXPENSE,
        amount: 75.0,
        currency: "USD",
        date: "2024-01-28",
        description: "Will be archived",
        categoryId: "test-category-archived",
      };

      // Create transaction first
      const created = await repository.create(createInput);

      // Archive the transaction
      await repository.archive(created.id, userId);

      // Act & Assert - Try to update archived transaction
      const updateInput = { amount: 100.0, description: "Should not work" };
      await expect(
        repository.update(created.id, userId, updateInput),
      ).rejects.toThrow("Transaction not found or is archived");
    });

    it("should throw error when trying to update transaction belonging to another user", async () => {
      // Arrange
      const ownerUserId = "transaction-owner-user";
      const otherUserId = "other-user-trying-to-update";
      const accountId = "test-account-owner";
      const createInput: CreateTransactionInput = {
        userId: ownerUserId,
        accountId,
        type: TransactionType.INCOME,
        amount: 250.0,
        currency: "USD",
        date: "2024-01-29",
        description: "Belongs to owner",
        categoryId: "owner-category",
      };

      // Create transaction as owner
      const created = await repository.create(createInput);

      // Act & Assert - Try to update as different user
      const updateInput = { amount: 500.0, description: "Hacker attempt" };
      await expect(
        repository.update(created.id, otherUserId, updateInput),
      ).rejects.toThrow("Transaction not found or is archived");

      // Verify original transaction is unchanged
      const original = await repository.findById(created.id, ownerUserId);
      expect(original).toBeDefined();
      expect(original?.amount).toBe(250.0);
      expect(original?.description).toBe("Belongs to owner");
      expect(original?.userId).toBe(ownerUserId);
    });

    it("should throw error for invalid parameters", async () => {
      // Arrange
      const updateInput = { amount: 50.0 };

      // Act & Assert - Missing transaction ID
      await expect(
        repository.update("", "user-id", updateInput),
      ).rejects.toThrow("Transaction ID and User ID are required");

      // Act & Assert - Missing user ID
      await expect(
        repository.update("transaction-id", "", updateInput),
      ).rejects.toThrow("Transaction ID and User ID are required");
    });
  });
});
