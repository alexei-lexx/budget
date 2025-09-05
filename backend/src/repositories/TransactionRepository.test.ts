import { TransactionRepository } from "./TransactionRepository";
import {
  TransactionType,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionPatternType,
} from "../models/Transaction";
import { faker } from "@faker-js/faker";
import { fakeCreateTransactionInput } from "../__tests__/utils/factories";
import { createDynamoDBDocumentClient } from "./utils/dynamoClient";
import { truncateTable } from "../__tests__/utils/dynamodbHelpers";

describe("TransactionRepository", () => {
  let repository: TransactionRepository;

  beforeAll(async () => {
    // Create repository instance
    repository = new TransactionRepository();
  });

  beforeEach(async () => {
    // Clean up transactions table before each test
    const client = createDynamoDBDocumentClient();
    const tableName = process.env.TRANSACTIONS_TABLE_NAME || "";
    await truncateTable(client, tableName, {
      partitionKey: "userId",
      sortKey: "id",
    });
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
      const stored = await repository.findActiveById(result.id, userId);
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
      const stored = await repository.findActiveById(result.id, userId);
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
      const stored = await repository.findActiveById(result.id, userId);
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

      const stored1 = await repository.findActiveById(
        result[0].id,
        inputs[0].userId,
      );
      const stored2 = await repository.findActiveById(
        result[1].id,
        inputs[1].userId,
      );

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
      const stored = await repository.findActiveById(result.id, userId);
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
      const stored = await repository.findActiveById(result.id, userId);
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
      const stored = await repository.findActiveById(result.id, userId);
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
      const stored = await repository.findActiveById(result.id, userId);
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
      const original = await repository.findActiveById(created.id, ownerUserId);
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

  describe("updateMany", () => {
    it("should throw error for empty input array", async () => {
      const updates: { id: string; input: UpdateTransactionInput }[] = [];
      const userId = "test-user-update-many";

      await expect(repository.updateMany(updates, userId)).rejects.toThrow(
        "At least one transaction update is required",
      );
    });

    it("should update multiple transactions successfully", async () => {
      const userId = "test-user-multi-update";

      const createInputs: CreateTransactionInput[] = [
        {
          userId,
          accountId: "test-account-1",
          categoryId: "test-category-1",
          type: TransactionType.INCOME,
          amount: 300.0,
          currency: "USD",
          date: "2024-01-01",
          description: "Test transaction 1",
        },
        {
          userId,
          accountId: "test-account-2",
          categoryId: "test-category-2",
          type: TransactionType.EXPENSE,
          amount: 150.0,
          currency: "EUR",
          date: "2024-01-02",
          description: "Test transaction 2",
        },
      ];

      const createdTransactions = await repository.createMany(createInputs);

      const updates: { id: string; input: UpdateTransactionInput }[] = [
        {
          id: createdTransactions[0].id,
          input: {
            accountId: "new-account-id-1",
            categoryId: "new-category-id-1",
            type: TransactionType.EXPENSE,
            amount: 350.0,
            currency: "EUR",
            date: "2024-02-01",
            description: "New description 1",
          },
        },
        {
          id: createdTransactions[1].id,
          input: {
            accountId: "new-account-id-2",
            categoryId: "new-category-id-2",
            type: TransactionType.INCOME,
            amount: 200.0,
            currency: "USD",
            date: "2024-02-02",
            description: "New description 2",
          },
        },
      ];

      await repository.updateMany(updates, userId);

      const stored1 = await repository.findActiveById(
        createdTransactions[0].id,
        userId,
      );

      expect(stored1).toBeDefined();
      expect(stored1?.accountId).toBe("new-account-id-1");
      expect(stored1?.categoryId).toBe("new-category-id-1");
      expect(stored1?.type).toBe(TransactionType.EXPENSE);
      expect(stored1?.amount).toBe(350.0);
      expect(stored1?.currency).toBe("EUR");
      expect(stored1?.date).toBe("2024-02-01");
      expect(stored1?.description).toBe("New description 1");

      const stored2 = await repository.findActiveById(
        createdTransactions[1].id,
        userId,
      );

      expect(stored2).toBeDefined();
      expect(stored2?.accountId).toBe("new-account-id-2");
      expect(stored2?.categoryId).toBe("new-category-id-2");
      expect(stored2?.type).toBe(TransactionType.INCOME);
      expect(stored2?.amount).toBe(200.0);
      expect(stored2?.currency).toBe("USD");
      expect(stored2?.date).toBe("2024-02-02");
      expect(stored2?.description).toBe("New description 2");
    });
  });

  describe("detectPatterns", () => {
    it("should return empty array for new user with no transactions", async () => {
      // Arrange
      const userId = faker.string.uuid();

      // Act
      const result = await repository.detectPatterns(
        userId,
        TransactionPatternType.INCOME,
        3,
        100,
      );

      // Assert
      expect(result).toEqual([]);
    });

    it("should return empty array when no transactions have category", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const createInputs: CreateTransactionInput[] = [
        fakeCreateTransactionInput({
          userId,
          categoryId: undefined,
          type: TransactionType.INCOME,
        }),
        fakeCreateTransactionInput({
          userId,
          categoryId: undefined,
          type: TransactionType.INCOME,
        }),
      ];

      await repository.createMany(createInputs);

      // Act
      const result = await repository.detectPatterns(
        userId,
        TransactionPatternType.INCOME,
        3,
        100,
      );

      // Assert
      expect(result).toEqual([]);
    });

    it("should return patterns sorted by usage count descending", async () => {
      const userId = faker.string.uuid();
      const createInputs: CreateTransactionInput[] = [
        // Pattern 1: account-1 + category-1 (3 occurrences)
        fakeCreateTransactionInput({
          userId,
          accountId: "account-1",
          categoryId: "category-1",
          type: TransactionType.INCOME,
        }),

        fakeCreateTransactionInput({
          userId,
          accountId: "account-1",
          categoryId: "category-1",
          type: TransactionType.INCOME,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId: "account-1",
          categoryId: "category-1",
          type: TransactionType.INCOME,
        }),
        // Pattern 2: account-2 + category-2 (2 occurrences)
        fakeCreateTransactionInput({
          userId,
          accountId: "account-2",
          categoryId: "category-2",
          type: TransactionType.INCOME,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId: "account-2",
          categoryId: "category-2",
          type: TransactionType.INCOME,
        }),
        // Pattern 3: account-3 + category-3 (1 occurrence)
        fakeCreateTransactionInput({
          userId,
          accountId: "account-3",
          categoryId: "category-3",
          type: TransactionType.INCOME,
        }),
      ];

      await repository.createMany(createInputs);

      const result = await repository.detectPatterns(
        userId,
        TransactionPatternType.INCOME,
        3,
        100,
      );

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        accountId: "account-1",
        categoryId: "category-1",
      });
      expect(result[1]).toEqual({
        accountId: "account-2",
        categoryId: "category-2",
      });
      expect(result[2]).toEqual({
        accountId: "account-3",
        categoryId: "category-3",
      });
    });

    it("should return only top N patterns based on limit", async () => {
      const userId = faker.string.uuid();
      const createInputs: CreateTransactionInput[] = [];

      // Create 5 different patterns with different usage counts
      for (let i = 1; i <= 5; i++) {
        for (let j = 0; j < i; j++) {
          createInputs.push(
            fakeCreateTransactionInput({
              userId,
              accountId: `account-${i}`,
              categoryId: `category-${i}`,
              type: TransactionType.EXPENSE,
            }),
          );
        }
      }

      await repository.createMany(createInputs);

      const result = await repository.detectPatterns(
        userId,
        TransactionPatternType.EXPENSE,
        3,
        100,
      );

      // Assert - Should return only top 3 patterns, sorted by frequency (most used first)
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        accountId: "account-5",
        categoryId: "category-5",
      }); // Most frequent (5 uses)
      expect(result[1]).toEqual({
        accountId: "account-4",
        categoryId: "category-4",
      }); // Second most frequent (4 uses)
      expect(result[2]).toEqual({
        accountId: "account-3",
        categoryId: "category-3",
      }); // Third most frequent (3 uses)
    });

    it("should sort deterministically when usage counts are equal", async () => {
      const userId = faker.string.uuid();
      const createInputs: CreateTransactionInput[] = [
        // Pattern 1: account-b + category-b (2 occurrences)
        fakeCreateTransactionInput({
          userId,
          accountId: "account-b",
          categoryId: "category-b",
          type: TransactionType.INCOME,
          amount: 100.0,
          currency: "USD",
          date: "2024-01-01",
        }),
        fakeCreateTransactionInput({
          userId,
          accountId: "account-b",
          categoryId: "category-b",
          type: TransactionType.INCOME,
          amount: 150.0,
          currency: "USD",
          date: "2024-01-02",
        }),
        // Pattern 2: account-a + category-a (2 occurrences, same count)
        fakeCreateTransactionInput({
          userId,
          accountId: "account-a",
          categoryId: "category-a",
          type: TransactionType.INCOME,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId: "account-a",
          categoryId: "category-a",
          type: TransactionType.INCOME,
        }),
        // Pattern 3: account-a + category-c (2 occurrences, same account different category)
        fakeCreateTransactionInput({
          userId,
          accountId: "account-a",
          categoryId: "category-c",
          type: TransactionType.INCOME,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId: "account-a",
          categoryId: "category-c",
          type: TransactionType.INCOME,
        }),
      ];

      await repository.createMany(createInputs);

      const result = await repository.detectPatterns(
        userId,
        TransactionPatternType.INCOME,
        3,
        100,
      );

      // Assert - Should sort deterministically by accountId, then categoryId
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        accountId: "account-a",
        categoryId: "category-a",
      });
      expect(result[1]).toEqual({
        accountId: "account-a",
        categoryId: "category-c",
      });
      expect(result[2]).toEqual({
        accountId: "account-b",
        categoryId: "category-b",
      });
    });

    it("should filter by transaction type correctly", async () => {
      const userId = faker.string.uuid();
      const createInputs: CreateTransactionInput[] = [
        // Income transactions
        fakeCreateTransactionInput({
          userId,
          accountId: "account-1",
          categoryId: "category-income",
          type: TransactionType.INCOME,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId: "account-1",
          categoryId: "category-income",
          type: TransactionType.INCOME,
        }),
        // Expense transactions
        fakeCreateTransactionInput({
          userId,
          accountId: "account-1",
          categoryId: "category-expense",
          type: TransactionType.EXPENSE,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId: "account-1",
          categoryId: "category-expense",
          type: TransactionType.EXPENSE,
        }),
        // Transfer transactions (should be excluded)
        fakeCreateTransactionInput({
          userId,
          accountId: "account-1",
          categoryId: "category-transfer",
          type: TransactionType.TRANSFER_IN,
        }),
      ];

      await repository.createMany(createInputs);

      const incomeResult = await repository.detectPatterns(
        userId,
        TransactionPatternType.INCOME,
        3,
        100,
      );

      const expenseResult = await repository.detectPatterns(
        userId,
        TransactionPatternType.EXPENSE,
        3,
        100,
      );

      expect(incomeResult).toHaveLength(1);
      expect(incomeResult[0]).toEqual({
        accountId: "account-1",
        categoryId: "category-income",
      });

      // Assert - Expense patterns
      expect(expenseResult).toHaveLength(1);
      expect(expenseResult[0]).toEqual({
        accountId: "account-1",
        categoryId: "category-expense",
      });
    });

    it("should exclude archived transactions", async () => {
      const userId = faker.string.uuid();
      const createInputs: CreateTransactionInput[] = [
        fakeCreateTransactionInput({
          userId,
          accountId: "account-1",
          categoryId: "category-1",
          type: TransactionType.INCOME,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId: "account-2",
          categoryId: "category-2",
          type: TransactionType.INCOME,
        }),
      ];

      const createdTransactions = await repository.createMany(createInputs);

      // Archive one transaction
      await repository.archive(createdTransactions[0].id, userId);

      const result = await repository.detectPatterns(
        userId,
        TransactionPatternType.INCOME,
        3,
        100,
      );

      // Assert - Should only count non-archived transaction
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        accountId: "account-2",
        categoryId: "category-2",
      });
    });

    it("should respect sample size limit", async () => {
      const userId = faker.string.uuid();

      // Create 5+5 transactions

      const createInputs1: CreateTransactionInput[] = [];
      for (let i = 0; i < 5; i++) {
        createInputs1.push(
          fakeCreateTransactionInput({
            userId,
            accountId: "account-1",
            categoryId: "category-1",
            type: TransactionType.INCOME,
          }),
        );
      }
      await repository.createMany(createInputs1);

      const createInputs2: CreateTransactionInput[] = [];
      for (let i = 0; i < 5; i++) {
        createInputs2.push(
          fakeCreateTransactionInput({
            userId,
            accountId: "account-2",
            categoryId: "category-2",
            type: TransactionType.INCOME,
          }),
        );
      }
      await repository.createMany(createInputs2);

      // Act - Request with sampleSize of 5 (should only analyze last 5 transactions)
      const result = await repository.detectPatterns(
        userId,
        TransactionPatternType.INCOME,
        3,
        5,
      );

      // Assert - Should return the pattern but only based on 5 transactions
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        accountId: "account-2",
        categoryId: "category-2",
        // Only 5 transactions analyzed due to sample size limit
      });
    });

    it("should throw error for missing user ID", async () => {
      await expect(
        repository.detectPatterns("", TransactionPatternType.INCOME, 3, 100),
      ).rejects.toThrow("User ID is required");
    });

    it("should throw error for invalid limit parameter", async () => {
      const userId = faker.string.uuid();

      // Act & Assert - Zero limit
      await expect(
        repository.detectPatterns(
          userId,
          TransactionPatternType.INCOME,
          0,
          100,
        ),
      ).rejects.toThrow("Limit must be a positive integer");

      // Act & Assert - Negative limit
      await expect(
        repository.detectPatterns(
          userId,
          TransactionPatternType.INCOME,
          -1,
          100,
        ),
      ).rejects.toThrow("Limit must be a positive integer");

      // Act & Assert - Non-integer limit
      await expect(
        repository.detectPatterns(
          userId,
          TransactionPatternType.INCOME,
          3.5,
          100,
        ),
      ).rejects.toThrow("Limit must be a positive integer");
    });

    it("should throw error for invalid sampleSize parameter", async () => {
      const userId = faker.string.uuid();

      // Act & Assert - Zero sample size
      await expect(
        repository.detectPatterns(userId, TransactionPatternType.INCOME, 3, 0),
      ).rejects.toThrow("Sample size must be a positive integer");

      // Act & Assert - Negative sample size
      await expect(
        repository.detectPatterns(userId, TransactionPatternType.INCOME, 3, -1),
      ).rejects.toThrow("Sample size must be a positive integer");

      // Act & Assert - Non-integer sample size
      await expect(
        repository.detectPatterns(
          userId,
          TransactionPatternType.INCOME,
          3,
          50.5,
        ),
      ).rejects.toThrow("Sample size must be a positive integer");
    });

    it("should return only top N patterns based on limit parameter", async () => {
      const userId = faker.string.uuid();
      const createInputs: CreateTransactionInput[] = [];

      // Create 5 different patterns
      for (let i = 1; i <= 5; i++) {
        createInputs.push(
          fakeCreateTransactionInput({
            userId,
            accountId: `account-${i}`,
            categoryId: `category-${i}`,
            type: TransactionType.INCOME,
          }),
        );
      }

      await repository.createMany(createInputs);

      // Act - Request only 2 patterns
      const result = await repository.detectPatterns(
        userId,
        TransactionPatternType.INCOME,
        2,
        100,
      );

      // Assert - Should return only 2 patterns
      expect(result).toHaveLength(2);
    });

    it("should isolate patterns by user", async () => {
      const user1 = faker.string.uuid();
      const user2 = faker.string.uuid();
      const createInputsUser1: CreateTransactionInput[] = [
        fakeCreateTransactionInput({
          userId: user1,
          accountId: "account-1",
          categoryId: "category-1",
          type: TransactionType.INCOME,
        }),
      ];
      const createInputsUser2: CreateTransactionInput[] = [
        fakeCreateTransactionInput({
          userId: user2,
          accountId: "account-2",
          categoryId: "category-2",
          type: TransactionType.INCOME,
        }),
      ];

      await repository.createMany([...createInputsUser1, ...createInputsUser2]);

      const user1Result = await repository.detectPatterns(
        user1,
        TransactionPatternType.INCOME,
        3,
        100,
      );
      const user2Result = await repository.detectPatterns(
        user2,
        TransactionPatternType.INCOME,
        3,
        100,
      );

      // Assert - Each user sees only their own patterns
      expect(user1Result).toHaveLength(1);
      expect(user1Result[0]).toEqual({
        accountId: "account-1",
        categoryId: "category-1",
      });

      expect(user2Result).toHaveLength(1);
      expect(user2Result[0]).toEqual({
        accountId: "account-2",
        categoryId: "category-2",
      });
    });
  });

  describe("findActiveByMonthAndType", () => {
    it("should filter by user", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const otherUserId = faker.string.uuid();
      const accountId = faker.string.uuid();

      await repository.createMany([
        fakeCreateTransactionInput({
          userId,
          accountId,
          type: TransactionType.EXPENSE,
          date: "2000-01-01",
        }),
        fakeCreateTransactionInput({
          userId: otherUserId,
          accountId,
          type: TransactionType.EXPENSE,
          date: "2000-01-02",
        }),
      ]);

      // Act
      const result = await repository.findActiveByMonthAndType(
        userId,
        2000,
        1,
        TransactionType.EXPENSE,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(userId);
    });

    it("should filter by month", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      await repository.createMany([
        fakeCreateTransactionInput({
          userId,
          accountId,
          type: TransactionType.EXPENSE,
          date: "2000-01-01",
        }),
        fakeCreateTransactionInput({
          userId,
          accountId,
          type: TransactionType.EXPENSE,
          date: "2000-02-01",
        }),
      ]);

      // Act
      const result = await repository.findActiveByMonthAndType(
        userId,
        2000,
        1,
        TransactionType.EXPENSE,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe("2000-01-01");
    });

    it("should filter by type", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      await repository.createMany([
        fakeCreateTransactionInput({
          userId,
          accountId,
          type: TransactionType.EXPENSE,
          date: "2000-01-01",
        }),
        fakeCreateTransactionInput({
          userId,
          accountId,
          type: TransactionType.INCOME,
          date: "2000-01-02",
        }),
      ]);

      // Act
      const result = await repository.findActiveByMonthAndType(
        userId,
        2000,
        1,
        TransactionType.EXPENSE,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(TransactionType.EXPENSE);
    });

    it("should skip archived transactions", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      const created = await repository.create(
        fakeCreateTransactionInput({
          userId,
          accountId,
          type: TransactionType.EXPENSE,
          date: "2000-01-01",
        }),
      );

      await repository.archive(created.id, userId);

      // Act
      const result = await repository.findActiveByMonthAndType(
        userId,
        2000,
        1,
        TransactionType.EXPENSE,
      );

      // Assert
      expect(result).toHaveLength(0);
    });

    it("should return multiple matching transactions", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      await repository.createMany([
        fakeCreateTransactionInput({
          userId,
          accountId,
          type: TransactionType.EXPENSE,
          date: "2000-01-05",
        }),
        fakeCreateTransactionInput({
          userId,
          accountId,
          type: TransactionType.EXPENSE,
          date: "2000-01-15",
        }),
        fakeCreateTransactionInput({
          userId,
          accountId,
          type: TransactionType.EXPENSE,
          date: "2000-01-25",
        }),
      ]);

      // Act
      const result = await repository.findActiveByMonthAndType(
        userId,
        2000,
        1,
        TransactionType.EXPENSE,
      );

      // Assert
      expect(result).toHaveLength(3);
      expect(result.every((t) => t.userId === userId)).toBe(true);
      expect(result.every((t) => t.type === TransactionType.EXPENSE)).toBe(
        true,
      );
      expect(result.every((t) => t.date.startsWith("2000-01"))).toBe(true);
    });

    it("should return empty array when no matches found", async () => {
      // Act
      const result = await repository.findActiveByMonthAndType(
        faker.string.uuid(),
        2000,
        12,
        TransactionType.EXPENSE,
      );

      // Assert
      expect(result).toHaveLength(0);
    });

    it("should throw error for invalid user ID", async () => {
      // Act & Assert
      await expect(
        repository.findActiveByMonthAndType(
          "",
          2000,
          1,
          TransactionType.EXPENSE,
        ),
      ).rejects.toThrow("User ID is required");
    });

    it("should throw error for invalid year", async () => {
      // Act & Assert
      const userId = faker.string.uuid();

      await expect(
        repository.findActiveByMonthAndType(
          userId,
          1800,
          1,
          TransactionType.EXPENSE,
        ),
      ).rejects.toThrow("Year must be a valid integer between 1900 and 2100");

      await expect(
        repository.findActiveByMonthAndType(
          userId,
          2200,
          1,
          TransactionType.EXPENSE,
        ),
      ).rejects.toThrow("Year must be a valid integer between 1900 and 2100");

      await expect(
        repository.findActiveByMonthAndType(
          userId,
          20.5,
          1,
          TransactionType.EXPENSE,
        ),
      ).rejects.toThrow("Year must be a valid integer between 1900 and 2100");
    });

    it("should throw error for invalid month", async () => {
      // Act & Assert
      const userId = faker.string.uuid();

      await expect(
        repository.findActiveByMonthAndType(
          userId,
          2000,
          0,
          TransactionType.EXPENSE,
        ),
      ).rejects.toThrow("Month must be a valid integer between 1 and 12");

      await expect(
        repository.findActiveByMonthAndType(
          userId,
          2000,
          13,
          TransactionType.EXPENSE,
        ),
      ).rejects.toThrow("Month must be a valid integer between 1 and 12");

      await expect(
        repository.findActiveByMonthAndType(
          userId,
          2000,
          1.5,
          TransactionType.EXPENSE,
        ),
      ).rejects.toThrow("Month must be a valid integer between 1 and 12");
    });
  });
});
