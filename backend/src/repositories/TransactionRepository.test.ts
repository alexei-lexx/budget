import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { faker } from "@faker-js/faker";
import { TransactionRepository } from "./TransactionRepository";
import {
  TransactionType,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionPatternType,
} from "../models/Transaction";
import { fakeCreateTransactionInput } from "../__tests__/utils/factories";
import { createDynamoDBDocumentClient } from "./utils/dynamoClient";
import { truncateTable } from "../__tests__/utils/dynamodbHelpers";
import { YEAR_RANGE_OFFSET } from "../types/validation";

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
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();
      const categoryId = faker.string.uuid();
      const input: CreateTransactionInput = {
        userId,
        accountId,
        type: TransactionType.INCOME,
        amount: 100.5,
        currency: "USD",
        date: "2024-01-15",
        description: "Test transaction",
        categoryId,
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
      expect(result.categoryId).toBe(categoryId);
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
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();
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
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();
      const transferId = faker.string.uuid();
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
      const userId1 = faker.string.uuid();
      const accountId1 = faker.string.uuid();
      const userId2 = faker.string.uuid();
      const accountId2 = faker.string.uuid();
      const inputs: CreateTransactionInput[] = [
        {
          userId: userId1,
          accountId: accountId1,
          type: TransactionType.INCOME,
          amount: 300.0,
          currency: "USD",
          date: "2024-01-18",
        },
        {
          userId: userId2,
          accountId: accountId2,
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
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();
      const createInput: CreateTransactionInput = {
        userId,
        accountId,
        type: TransactionType.EXPENSE,
        amount: 75.0,
        currency: "USD",
        date: "2024-01-20",
        description: "Original description",
        categoryId: faker.string.uuid(),
      };

      // Create transaction first
      const created = await repository.create(createInput);

      // Act - Update ALL possible attributes
      const newAccountId = faker.string.uuid();
      const newCategoryId = faker.string.uuid();
      const updateInput = {
        accountId: newAccountId,
        type: TransactionType.INCOME,
        amount: 100.0,
        currency: "EUR",
        date: "2024-02-01",
        description: "Updated description",
        categoryId: newCategoryId,
      };
      const result = await repository.update(created.id, userId, updateInput);

      // Assert - All attributes updated
      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
      expect(result.userId).toBe(userId);
      expect(result.accountId).toBe(newAccountId);
      expect(result.type).toBe(TransactionType.INCOME);
      expect(result.amount).toBe(100.0);
      expect(result.currency).toBe("EUR");
      expect(result.date).toBe("2024-02-01");
      expect(result.description).toBe("Updated description");
      expect(result.categoryId).toBe(newCategoryId);
      expect(result.isArchived).toBe(false);
      expect(result.createdAt).toBe(created.createdAt);
      expect(result.updatedAt).not.toBe(created.updatedAt);

      // Refetch from database to verify stored data matches result
      const stored = await repository.findActiveById(result.id, userId);
      expect(stored).toEqual(result);
    });

    it("should update no attributes (only updatedAt changes)", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();
      const categoryId = faker.string.uuid();
      const createInput: CreateTransactionInput = {
        userId,
        accountId,
        type: TransactionType.EXPENSE,
        amount: 50.0,
        currency: "USD",
        date: "2024-01-25",
        description: "No change description",
        categoryId,
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
      expect(result.categoryId).toBe(categoryId);
      expect(result.isArchived).toBe(false);
      expect(result.createdAt).toBe(created.createdAt);
      expect(result.updatedAt).not.toBe(created.updatedAt);

      // Refetch from database to verify stored data matches result
      const stored = await repository.findActiveById(result.id, userId);
      expect(stored).toEqual(result);
    });

    it("should overwrite with null values", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();
      const createInput: CreateTransactionInput = {
        userId,
        accountId,
        type: TransactionType.INCOME,
        amount: 200.0,
        currency: "EUR",
        date: "2024-01-21",
        description: "Test description",
        categoryId: faker.string.uuid(),
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
      expect(result.description).toBeUndefined();
      expect(result.categoryId).toBeUndefined();

      // Refetch from database to verify stored data matches result
      const stored = await repository.findActiveById(result.id, userId);
      expect(stored).toEqual(result);
    });

    it("should update single field (partial update)", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();
      const originalCategoryId = faker.string.uuid();
      const createInput: CreateTransactionInput = {
        userId,
        accountId,
        type: TransactionType.EXPENSE,
        amount: 150.0,
        currency: "GBP",
        date: "2024-01-22",
        description: "Original description",
        categoryId: originalCategoryId,
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
      expect(result.categoryId).toBe(originalCategoryId);
      expect(result.type).toBe(TransactionType.EXPENSE);
      expect(result.currency).toBe("GBP");
      expect(result.date).toBe("2024-01-22");

      // Refetch from database to verify stored data matches result
      const stored = await repository.findActiveById(result.id, userId);
      expect(stored).toEqual(result);
    });

    it("should throw error for non-existent transaction", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const nonExistentId = "non-existent-transaction-id";
      const updateInput = { amount: 50.0 };

      // Act & Assert
      await expect(
        repository.update(nonExistentId, userId, updateInput),
      ).rejects.toThrow("Transaction not found or is archived");
    });

    it("should throw error when trying to update archived transaction", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();
      const createInput: CreateTransactionInput = {
        userId,
        accountId,
        type: TransactionType.EXPENSE,
        amount: 75.0,
        currency: "USD",
        date: "2024-01-28",
        description: "Will be archived",
        categoryId: faker.string.uuid(),
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
      const ownerUserId = faker.string.uuid();
      const otherUserId = faker.string.uuid();
      const accountId = faker.string.uuid();
      const createInput: CreateTransactionInput = {
        userId: ownerUserId,
        accountId,
        type: TransactionType.INCOME,
        amount: 250.0,
        currency: "USD",
        date: "2024-01-29",
        description: "Belongs to owner",
        categoryId: faker.string.uuid(),
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
      const userId = faker.string.uuid();

      await expect(repository.updateMany(updates, userId)).rejects.toThrow(
        "At least one transaction update is required",
      );
    });

    it("should update multiple transactions successfully", async () => {
      const userId = faker.string.uuid();

      const createInputs: CreateTransactionInput[] = [
        {
          userId,
          accountId: faker.string.uuid(),
          categoryId: faker.string.uuid(),
          type: TransactionType.INCOME,
          amount: 300.0,
          currency: "USD",
          date: "2024-01-01",
          description: "Test transaction 1",
        },
        {
          userId,
          accountId: faker.string.uuid(),
          categoryId: faker.string.uuid(),
          type: TransactionType.EXPENSE,
          amount: 150.0,
          currency: "EUR",
          date: "2024-01-02",
          description: "Test transaction 2",
        },
      ];

      const createdTransactions = await repository.createMany(createInputs);

      const newAccountId1 = faker.string.uuid();
      const newCategoryId1 = faker.string.uuid();
      const newAccountId2 = faker.string.uuid();
      const newCategoryId2 = faker.string.uuid();

      const updates: { id: string; input: UpdateTransactionInput }[] = [
        {
          id: createdTransactions[0].id,
          input: {
            accountId: newAccountId1,
            categoryId: newCategoryId1,
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
            accountId: newAccountId2,
            categoryId: newCategoryId2,
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
      expect(stored1?.accountId).toBe(newAccountId1);
      expect(stored1?.categoryId).toBe(newCategoryId1);
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
      expect(stored2?.accountId).toBe(newAccountId2);
      expect(stored2?.categoryId).toBe(newCategoryId2);
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
      const account1 = faker.string.uuid();
      const category1 = faker.string.uuid();
      const account2 = faker.string.uuid();
      const category2 = faker.string.uuid();
      const account3 = faker.string.uuid();
      const category3 = faker.string.uuid();

      const createInputs: CreateTransactionInput[] = [
        // Pattern 1: account1 + category1 (3 occurrences)
        fakeCreateTransactionInput({
          userId,
          accountId: account1,
          categoryId: category1,
          type: TransactionType.INCOME,
        }),

        fakeCreateTransactionInput({
          userId,
          accountId: account1,
          categoryId: category1,
          type: TransactionType.INCOME,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId: account1,
          categoryId: category1,
          type: TransactionType.INCOME,
        }),
        // Pattern 2: account2 + category2 (2 occurrences)
        fakeCreateTransactionInput({
          userId,
          accountId: account2,
          categoryId: category2,
          type: TransactionType.INCOME,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId: account2,
          categoryId: category2,
          type: TransactionType.INCOME,
        }),
        // Pattern 3: account3 + category3 (1 occurrence)
        fakeCreateTransactionInput({
          userId,
          accountId: account3,
          categoryId: category3,
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
        accountId: account1,
        categoryId: category1,
      });
      expect(result[1]).toEqual({
        accountId: account2,
        categoryId: category2,
      });
      expect(result[2]).toEqual({
        accountId: account3,
        categoryId: category3,
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
      const account1 = faker.string.uuid();
      const category1 = faker.string.uuid();
      const account2 = faker.string.uuid();
      const category2 = faker.string.uuid();

      const createInputs: CreateTransactionInput[] = [
        fakeCreateTransactionInput({
          userId,
          accountId: account1,
          categoryId: category1,
          type: TransactionType.INCOME,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId: account2,
          categoryId: category2,
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
        accountId: account2,
        categoryId: category2,
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

  describe("findActiveByDescription", () => {
    it("should return transactions that contain search text (case-sensitive)", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      // Create transactions individually with delays to ensure proper ordering
      await repository.create(
        fakeCreateTransactionInput({
          userId,
          accountId,
          description: "Grocery store",
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      await repository.create(
        fakeCreateTransactionInput({
          userId,
          accountId,
          description: "Grocery shopping",
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      await repository.create(
        fakeCreateTransactionInput({
          userId,
          accountId,
          description: "Gas station",
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      await repository.create(
        fakeCreateTransactionInput({
          userId,
          accountId,
          description: "Restaurant meal",
        }),
      );

      // Act
      const result = await repository.findActiveByDescription(userId, "Gr", 10);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].description).toBe("Grocery shopping"); // Most recent first
      expect(result[1].description).toBe("Grocery store");
    });

    it("should be case-sensitive in matching", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      const createInputs: CreateTransactionInput[] = [
        fakeCreateTransactionInput({
          userId,
          accountId,
          description: "Grocery store",
        }),
        fakeCreateTransactionInput({
          userId,
          accountId,
          description: "grocery shopping",
        }),
      ];

      await repository.createMany(createInputs);

      // Act - Search with uppercase "G"
      const resultUppercase = await repository.findActiveByDescription(
        userId,
        "Gr",
        10,
      );

      // Act - Search with lowercase "g"
      const resultLowercase = await repository.findActiveByDescription(
        userId,
        "gr",
        10,
      );

      // Assert
      expect(resultUppercase).toHaveLength(1);
      expect(resultUppercase[0].description).toBe("Grocery store");

      expect(resultLowercase).toHaveLength(1);
      expect(resultLowercase[0].description).toBe("grocery shopping");
    });

    it("should return results ordered by creation time (most recent first)", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      // Create transactions with a delay to ensure different creation times
      const transaction1 = await repository.create(
        fakeCreateTransactionInput({
          userId,
          accountId,
          description: "Store purchase 1",
        }),
      );

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const transaction2 = await repository.create(
        fakeCreateTransactionInput({
          userId,
          accountId,
          description: "Store purchase 2",
        }),
      );

      // Act
      const result = await repository.findActiveByDescription(
        userId,
        "Store",
        10,
      );

      // Assert - Should be ordered by creation time (newest first)
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(transaction2.id);
      expect(result[1].id).toBe(transaction1.id);
    });

    it("should respect the limit parameter", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      const createInputs: CreateTransactionInput[] = [];
      for (let i = 1; i <= 3; i++) {
        createInputs.push(
          fakeCreateTransactionInput({
            userId,
            accountId,
            description: `Store transaction ${i}`,
          }),
        );
      }

      await repository.createMany(createInputs);

      // Act
      const result = await repository.findActiveByDescription(
        userId,
        "Store",
        2,
      );

      // Assert
      expect(result).toHaveLength(2);
    });

    it("should exclude transactions without descriptions", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      const createInputs: CreateTransactionInput[] = [
        fakeCreateTransactionInput({
          userId,
          accountId,
          description: "Grocery store",
        }),
        fakeCreateTransactionInput({
          userId,
          accountId,
          description: undefined, // No description
        }),
      ];

      await repository.createMany(createInputs);

      // Act
      const result = await repository.findActiveByDescription(
        userId,
        "store",
        10,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe("Grocery store");
    });

    it("should exclude archived transactions", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      const createInputs: CreateTransactionInput[] = [
        fakeCreateTransactionInput({
          userId,
          accountId,
          description: "Store purchase 1",
        }),
        fakeCreateTransactionInput({
          userId,
          accountId,
          description: "Store purchase 2",
        }),
      ];

      const createdTransactions = await repository.createMany(createInputs);

      // Archive one transaction
      await repository.archive(createdTransactions[0].id, userId);

      // Act
      const result = await repository.findActiveByDescription(
        userId,
        "Store",
        10,
      );

      // Assert - Should only return non-archived transaction
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe("Store purchase 2");
    });

    it("should isolate results by user", async () => {
      // Arrange
      const user1 = faker.string.uuid();
      const user2 = faker.string.uuid();
      const accountId = faker.string.uuid();

      const createInputs: CreateTransactionInput[] = [
        fakeCreateTransactionInput({
          userId: user1,
          accountId,
          description: "User 1 store",
        }),
        fakeCreateTransactionInput({
          userId: user2,
          accountId,
          description: "User 2 store",
        }),
      ];

      await repository.createMany(createInputs);

      // Act
      const user1Result = await repository.findActiveByDescription(
        user1,
        "store",
        10,
      );
      const user2Result = await repository.findActiveByDescription(
        user2,
        "store",
        10,
      );

      // Assert - Each user sees only their own transactions
      expect(user1Result).toHaveLength(1);
      expect(user1Result[0].description).toBe("User 1 store");
      expect(user1Result[0].userId).toBe(user1);

      expect(user2Result).toHaveLength(1);
      expect(user2Result[0].description).toBe("User 2 store");
      expect(user2Result[0].userId).toBe(user2);
    });

    it("should return empty array when no matches found", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      const createInputs: CreateTransactionInput[] = [
        fakeCreateTransactionInput({
          userId,
          accountId,
          description: "Grocery store",
        }),
      ];

      await repository.createMany(createInputs);

      // Act
      const result = await repository.findActiveByDescription(
        userId,
        "xyz",
        10,
      );

      // Assert
      expect(result).toHaveLength(0);
    });

    it("should return empty array for user with no transactions", async () => {
      // Arrange
      const userId = faker.string.uuid();

      // Act
      const result = await repository.findActiveByDescription(
        userId,
        "store",
        10,
      );

      // Assert
      expect(result).toHaveLength(0);
    });

    it("should throw error for missing user ID", async () => {
      // Act & Assert
      await expect(
        repository.findActiveByDescription("", "store", 10),
      ).rejects.toThrow("User ID is required");
    });

    it("should throw error for search text less than 2 characters", async () => {
      // Arrange
      const userId = faker.string.uuid();

      // Act & Assert - Empty search text
      await expect(
        repository.findActiveByDescription(userId, "", 10),
      ).rejects.toThrow("Search text must be at least 2 characters");

      // Act & Assert - Single character
      await expect(
        repository.findActiveByDescription(userId, "a", 10),
      ).rejects.toThrow("Search text must be at least 2 characters");
    });

    it("should throw error for invalid limit parameter", async () => {
      // Arrange
      const userId = faker.string.uuid();

      // Act & Assert - Zero limit
      await expect(
        repository.findActiveByDescription(userId, "store", 0),
      ).rejects.toThrow("Limit must be a positive integer");

      // Act & Assert - Negative limit
      await expect(
        repository.findActiveByDescription(userId, "store", -1),
      ).rejects.toThrow("Limit must be a positive integer");

      // Act & Assert - Non-integer limit
      await expect(
        repository.findActiveByDescription(userId, "store", 3.5),
      ).rejects.toThrow("Limit must be a positive integer");
    });

    it("should handle exact string matches", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      const createInputs: CreateTransactionInput[] = [
        fakeCreateTransactionInput({
          userId,
          accountId,
          description: "Exact match",
        }),
        fakeCreateTransactionInput({
          userId,
          accountId,
          description: "Not a match",
        }),
      ];

      await repository.createMany(createInputs);

      // Act
      const result = await repository.findActiveByDescription(
        userId,
        "Exact match",
        10,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe("Exact match");
    });

    it("should handle substring matches", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      const createInputs: CreateTransactionInput[] = [
        fakeCreateTransactionInput({
          userId,
          accountId,
          description: "This is a long description with multiple words",
        }),
        fakeCreateTransactionInput({
          userId,
          accountId,
          description: "Short desc",
        }),
      ];

      await repository.createMany(createInputs);

      // Act
      const result = await repository.findActiveByDescription(
        userId,
        "long description",
        10,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe(
        "This is a long description with multiple words",
      );
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

      const currentYear = new Date().getFullYear();
      const minYear = currentYear - YEAR_RANGE_OFFSET;
      const maxYear = currentYear + YEAR_RANGE_OFFSET;
      const expectedMessage = `Year must be a valid integer between ${minYear} and ${maxYear}`;

      await expect(
        repository.findActiveByMonthAndType(
          userId,
          minYear - 1,
          1,
          TransactionType.EXPENSE,
        ),
      ).rejects.toThrow(expectedMessage);

      await expect(
        repository.findActiveByMonthAndType(
          userId,
          maxYear + 1,
          1,
          TransactionType.EXPENSE,
        ),
      ).rejects.toThrow(expectedMessage);

      await expect(
        repository.findActiveByMonthAndType(
          userId,
          20.5,
          1,
          TransactionType.EXPENSE,
        ),
      ).rejects.toThrow(expectedMessage);
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

  describe("findActiveByUserId with account filters", () => {
    it("should filter transactions by single account ID", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const account1 = faker.string.uuid();
      const account2 = faker.string.uuid();

      // Create transactions for different accounts
      await repository.createMany([
        fakeCreateTransactionInput({ userId, accountId: account1 }),
        fakeCreateTransactionInput({ userId, accountId: account2 }),
        fakeCreateTransactionInput({ userId, accountId: account1 }),
      ]);

      // Act
      const result = await repository.findActiveByUserId(userId, undefined, {
        accountIds: [account1],
      });

      // Assert
      expect(result.edges).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      result.edges.forEach((edge) => {
        expect(edge.node.accountId).toBe(account1);
      });
    });

    it("should filter transactions by multiple account IDs", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const account1 = faker.string.uuid();
      const account2 = faker.string.uuid();
      const account3 = faker.string.uuid();

      // Create transactions for three different accounts
      await repository.createMany([
        fakeCreateTransactionInput({ userId, accountId: account1 }),
        fakeCreateTransactionInput({ userId, accountId: account2 }),
        fakeCreateTransactionInput({ userId, accountId: account3 }),
        fakeCreateTransactionInput({ userId, accountId: account1 }),
      ]);

      // Act - Filter by account1 and account2 (should get 3 transactions)
      const result = await repository.findActiveByUserId(userId, undefined, {
        accountIds: [account1, account2],
      });

      // Assert
      expect(result.edges).toHaveLength(3);
      expect(result.totalCount).toBe(3);
      const accountIds = result.edges.map((edge) => edge.node.accountId);
      expect(accountIds).toEqual(
        expect.arrayContaining([account1, account1, account2]),
      );
    });

    it("should return empty results when filtering by non-existent account ID", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const account1 = faker.string.uuid();
      const nonExistentAccount = faker.string.uuid();

      await repository.create(
        fakeCreateTransactionInput({ userId, accountId: account1 }),
      );

      // Act
      const result = await repository.findActiveByUserId(userId, undefined, {
        accountIds: [nonExistentAccount],
      });

      // Assert
      expect(result.edges).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe("findActiveByUserId with category filters", () => {
    it("should filter transactions by single category ID", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();
      const category1 = faker.string.uuid();
      const category2 = faker.string.uuid();

      // Create transactions for different categories
      await repository.createMany([
        fakeCreateTransactionInput({
          userId,
          accountId,
          categoryId: category1,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId,
          categoryId: category2,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId,
          categoryId: category1,
        }),
      ]);

      // Act
      const result = await repository.findActiveByUserId(userId, undefined, {
        categoryIds: [category1],
      });

      // Assert
      expect(result.edges).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      result.edges.forEach((edge) => {
        expect(edge.node.categoryId).toBe(category1);
      });
    });

    it("should filter transactions by multiple category IDs", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();
      const category1 = faker.string.uuid();
      const category2 = faker.string.uuid();
      const category3 = faker.string.uuid();

      // Create transactions for three different categories
      await repository.createMany([
        fakeCreateTransactionInput({
          userId,
          accountId,
          categoryId: category1,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId,
          categoryId: category2,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId,
          categoryId: category3,
        }),
      ]);

      // Act - Filter by category1 and category2
      const result = await repository.findActiveByUserId(userId, undefined, {
        categoryIds: [category1, category2],
      });

      // Assert
      expect(result.edges).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      const categoryIds = result.edges.map((edge) => edge.node.categoryId);
      expect(categoryIds).toEqual(
        expect.arrayContaining([category1, category2]),
      );
    });

    it("should include only uncategorized transactions when includeUncategorized is true and no categoryIds", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();
      const category1 = faker.string.uuid();

      // Create transactions: some with categories, some without
      await repository.createMany([
        fakeCreateTransactionInput({
          userId,
          accountId,
          categoryId: category1,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId,
          categoryId: undefined,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId,
          categoryId: undefined,
        }),
      ]);

      // Act
      const result = await repository.findActiveByUserId(userId, undefined, {
        includeUncategorized: true,
      });

      // Assert
      expect(result.edges).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      result.edges.forEach((edge) => {
        expect(edge.node.categoryId).toBeUndefined();
      });
    });

    it("should include both categorized and uncategorized transactions when both filters are provided", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();
      const category1 = faker.string.uuid();
      const category2 = faker.string.uuid();

      // Create transactions: some with category1, some with category2, some uncategorized
      await repository.createMany([
        fakeCreateTransactionInput({
          userId,
          accountId,
          categoryId: category1,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId,
          categoryId: category2,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId,
          categoryId: undefined,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId,
          categoryId: category1,
        }),
      ]);

      // Act - Filter by category1 + uncategorized
      const result = await repository.findActiveByUserId(userId, undefined, {
        categoryIds: [category1],
        includeUncategorized: true,
      });

      // Assert
      expect(result.edges).toHaveLength(3);
      expect(result.totalCount).toBe(3);
      const categoryIds = result.edges.map((edge) => edge.node.categoryId);
      expect(categoryIds.filter((id) => id === category1)).toHaveLength(2);
      expect(categoryIds.filter((id) => id === undefined)).toHaveLength(1);
    });

    it("should return empty results when filtering by non-existent category ID", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();
      const category1 = faker.string.uuid();
      const nonExistentCategory = faker.string.uuid();

      await repository.create(
        fakeCreateTransactionInput({
          userId,
          accountId,
          categoryId: category1,
        }),
      );

      // Act
      const result = await repository.findActiveByUserId(userId, undefined, {
        categoryIds: [nonExistentCategory],
      });

      // Assert
      expect(result.edges).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe("findActiveByUserId with date filters", () => {
    it("should filter transactions by dateAfter (inclusive)", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      await repository.createMany([
        fakeCreateTransactionInput({ userId, accountId, date: "2024-01-10" }),
        fakeCreateTransactionInput({ userId, accountId, date: "2024-01-15" }),
        fakeCreateTransactionInput({ userId, accountId, date: "2024-01-20" }),
      ]);

      // Act - Get transactions on or after 2024-01-15 (should include 2024-01-15)
      const result = await repository.findActiveByUserId(userId, undefined, {
        dateAfter: "2024-01-15",
      });

      // Assert - Should include the boundary date (2024-01-15)
      expect(result.edges).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      const dates = result.edges.map((edge) => edge.node.date).sort();
      expect(dates).toEqual(["2024-01-15", "2024-01-20"]);
    });

    it("should filter transactions by dateBefore (inclusive)", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      await repository.createMany([
        fakeCreateTransactionInput({ userId, accountId, date: "2024-01-10" }),
        fakeCreateTransactionInput({ userId, accountId, date: "2024-01-20" }),
        fakeCreateTransactionInput({ userId, accountId, date: "2024-01-25" }),
      ]);

      // Act - Get transactions on or before 2024-01-20 (should include 2024-01-20)
      const result = await repository.findActiveByUserId(userId, undefined, {
        dateBefore: "2024-01-20",
      });

      // Assert - Should include the boundary date (2024-01-20)
      expect(result.edges).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      const dates = result.edges.map((edge) => edge.node.date).sort();
      expect(dates).toEqual(["2024-01-10", "2024-01-20"]);
    });

    it("should filter transactions by date range (both boundaries inclusive)", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      await repository.createMany([
        fakeCreateTransactionInput({ userId, accountId, date: "2024-01-05" }),
        fakeCreateTransactionInput({ userId, accountId, date: "2024-01-10" }),
        fakeCreateTransactionInput({ userId, accountId, date: "2024-01-15" }),
        fakeCreateTransactionInput({ userId, accountId, date: "2024-01-20" }),
        fakeCreateTransactionInput({ userId, accountId, date: "2024-01-25" }),
      ]);

      // Act - Get transactions between 2024-01-10 and 2024-01-20 (both inclusive)
      const result = await repository.findActiveByUserId(userId, undefined, {
        dateAfter: "2024-01-10",
        dateBefore: "2024-01-20",
      });

      // Assert - Should include both boundary dates (2024-01-10 and 2024-01-20)
      expect(result.edges).toHaveLength(3);
      expect(result.totalCount).toBe(3);
      const dates = result.edges.map((edge) => edge.node.date).sort();
      expect(dates).toEqual(["2024-01-10", "2024-01-15", "2024-01-20"]);
    });

    it("should throw error when dateAfter > dateBefore (DynamoDB constraint)", async () => {
      // Verify DynamoDB constraint behavior when dateAfter > dateBefore
      // DynamoDB BETWEEN operator requires lower bound <= upper bound
      // When this is violated, DynamoDB throws ValidationException
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      await repository.createMany([
        fakeCreateTransactionInput({ userId, accountId, date: "2024-01-01" }),
        fakeCreateTransactionInput({ userId, accountId, date: "2024-06-15" }),
        fakeCreateTransactionInput({ userId, accountId, date: "2024-12-31" }),
      ]);

      // Act & Assert - Should throw error when dateAfter > dateBefore
      await expect(
        repository.findActiveByUserId(userId, undefined, {
          dateAfter: "2024-12-31",
          dateBefore: "2024-01-01",
        }),
      ).rejects.toThrow();
    });
  });

  describe("findActiveByUserId with type filters", () => {
    it("should filter transactions by single type", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      await repository.createMany([
        fakeCreateTransactionInput({
          userId,
          accountId,
          type: TransactionType.INCOME,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId,
          type: TransactionType.EXPENSE,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId,
          type: TransactionType.INCOME,
        }),
      ]);

      // Act
      const result = await repository.findActiveByUserId(userId, undefined, {
        types: [TransactionType.INCOME],
      });

      // Assert
      expect(result.edges).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      result.edges.forEach((edge) => {
        expect(edge.node.type).toBe(TransactionType.INCOME);
      });
    });

    it("should filter transactions by multiple types", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      await repository.createMany([
        fakeCreateTransactionInput({
          userId,
          accountId,
          type: TransactionType.INCOME,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId,
          type: TransactionType.EXPENSE,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId,
          type: TransactionType.TRANSFER_IN,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId,
          type: TransactionType.TRANSFER_OUT,
        }),
      ]);

      // Act
      const result = await repository.findActiveByUserId(userId, undefined, {
        types: [TransactionType.INCOME, TransactionType.EXPENSE],
      });

      // Assert
      expect(result.edges).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      const types = result.edges.map((edge) => edge.node.type);
      expect(types).toEqual(
        expect.arrayContaining([
          TransactionType.INCOME,
          TransactionType.EXPENSE,
        ]),
      );
    });
  });

  describe("findActiveByUserId with combined filters", () => {
    it("should filter by account and date range", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const account1 = faker.string.uuid();
      const account2 = faker.string.uuid();

      await repository.createMany([
        fakeCreateTransactionInput({
          userId,
          accountId: account1,
          date: "2024-01-10",
        }),
        fakeCreateTransactionInput({
          userId,
          accountId: account1,
          date: "2024-01-20",
        }),
        fakeCreateTransactionInput({
          userId,
          accountId: account2,
          date: "2024-01-15",
        }),
        fakeCreateTransactionInput({
          userId,
          accountId: account2,
          date: "2024-01-25",
        }),
      ]);

      // Act
      const result = await repository.findActiveByUserId(userId, undefined, {
        accountIds: [account1],
        dateAfter: "2024-01-12",
        dateBefore: "2024-01-22",
      });

      // Assert
      expect(result.edges).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.edges[0].node.accountId).toBe(account1);
      expect(result.edges[0].node.date).toBe("2024-01-20");
    });

    it("should filter by category and type", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();
      const category1 = faker.string.uuid();
      const category2 = faker.string.uuid();

      await repository.createMany([
        fakeCreateTransactionInput({
          userId,
          accountId,
          categoryId: category1,
          type: TransactionType.INCOME,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId,
          categoryId: category1,
          type: TransactionType.EXPENSE,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId,
          categoryId: category2,
          type: TransactionType.INCOME,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId,
          categoryId: category2,
          type: TransactionType.EXPENSE,
        }),
      ]);

      // Act
      const result = await repository.findActiveByUserId(userId, undefined, {
        categoryIds: [category1],
        types: [TransactionType.EXPENSE],
      });

      // Assert
      expect(result.edges).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.edges[0].node.categoryId).toBe(category1);
      expect(result.edges[0].node.type).toBe(TransactionType.EXPENSE);
    });

    it("should filter by account, category, date range, and type", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const account1 = faker.string.uuid();
      const account2 = faker.string.uuid();
      const category1 = faker.string.uuid();
      const category2 = faker.string.uuid();

      await repository.createMany([
        fakeCreateTransactionInput({
          userId,
          accountId: account1,
          categoryId: category1,
          date: "2024-01-15",
          type: TransactionType.EXPENSE,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId: account1,
          categoryId: category1,
          date: "2024-01-20",
          type: TransactionType.EXPENSE,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId: account1,
          categoryId: category2,
          date: "2024-01-20",
          type: TransactionType.EXPENSE,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId: account2,
          categoryId: category1,
          date: "2024-01-20",
          type: TransactionType.EXPENSE,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId: account1,
          categoryId: category1,
          date: "2024-01-20",
          type: TransactionType.INCOME,
        }),
        fakeCreateTransactionInput({
          userId,
          accountId: account1,
          categoryId: category1,
          date: "2024-01-25",
          type: TransactionType.EXPENSE,
        }),
      ]);

      // Act - Complex filter: account1 + category1 + date range + EXPENSE type
      const result = await repository.findActiveByUserId(userId, undefined, {
        accountIds: [account1],
        categoryIds: [category1],
        dateAfter: "2024-01-18",
        dateBefore: "2024-01-22",
        types: [TransactionType.EXPENSE],
      });

      // Assert - Should only match one transaction
      expect(result.edges).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.edges[0].node.accountId).toBe(account1);
      expect(result.edges[0].node.categoryId).toBe(category1);
      expect(result.edges[0].node.date).toBe("2024-01-20");
      expect(result.edges[0].node.type).toBe(TransactionType.EXPENSE);
    });
  });

  describe("hydration - data corruption detection", () => {
    it("should throw error when required field amount is missing from database record", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const input = fakeCreateTransactionInput({ userId });
      const transaction = await repository.create(input);
      const client = createDynamoDBDocumentClient();

      // Manually corrupt the database record by removing amount
      const tableName = process.env.TRANSACTIONS_TABLE_NAME || "";
      await client.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { userId, id: transaction.id },
          UpdateExpression: "REMOVE amount",
        }),
      );

      // Act & Assert
      await expect(
        repository.findActiveById(transaction.id, userId),
      ).rejects.toThrow();
    });
  });
});
