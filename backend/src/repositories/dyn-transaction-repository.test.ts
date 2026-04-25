import {
  BatchGetCommand,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { faker } from "@faker-js/faker";
import { beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import {
  Transaction,
  TransactionEntity,
  TransactionPatternType,
  TransactionType,
} from "../models/transaction";
import { VersionConflictError } from "../ports/repository-error";
import { toDateString } from "../types/date";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import { requireEnv } from "../utils/require-env";
import { truncateTable } from "../utils/test-utils/dynamodb-helpers";
import { fakeTransaction } from "../utils/test-utils/models/transaction-fakes";
import { DynTransactionRepository } from "./dyn-transaction-repository";

describe("DynTransactionRepository", () => {
  let repository: DynTransactionRepository;
  const tableName = requireEnv("TRANSACTIONS_TABLE_NAME");

  beforeAll(async () => {
    // Create repository instance
    repository = new DynTransactionRepository(tableName);
  });

  beforeEach(async () => {
    // Clean up transactions table before each test
    const client = createDynamoDBDocumentClient();
    await truncateTable(client, tableName, {
      partitionKey: "userId",
      sortKey: "id",
    });
  });

  describe("findManyByUserId", () => {
    it("returns transactions that belong to user and are not archived", async () => {
      const userId = faker.string.uuid();

      // Active transactions for the user
      const active1 = fakeTransaction({ userId });
      await repository.create(active1);
      const active2 = fakeTransaction({ userId });
      await repository.create(active2);

      // Archived transaction for the user
      const archived = fakeTransaction({ userId, isArchived: true });
      await repository.create(archived);

      // Transaction belonging to another user
      await repository.create(fakeTransaction({ userId: faker.string.uuid() }));

      // Act
      const result = await repository.findManyByUserId(userId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(active1);
      expect(result).toContainEqual(active2);
    });

    it("returns empty array when no transactions exist", async () => {
      const userId = faker.string.uuid();

      // Act
      const result = await repository.findManyByUserId(userId);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe("findManyByUserIdPaginated", () => {
    describe("without filters", () => {
      it("returns transactions for user", async () => {
        // Arrange
        const userId = faker.string.uuid();

        // Transactions for the user
        const transaction1 = fakeTransaction({ userId });
        await repository.create(transaction1);
        const transaction2 = fakeTransaction({ userId });
        await repository.create(transaction2);

        // Transaction for another user
        await repository.create(
          fakeTransaction({ userId: faker.string.uuid() }),
        );

        // Act
        const result = await repository.findManyByUserIdPaginated(userId);

        // Assert
        expect(result.edges).toHaveLength(2);
        expect(result.totalCount).toBe(2);
        expect(result.edges.map((edge) => edge.node)).toEqual(
          expect.arrayContaining([transaction1, transaction2]),
        );
      });
    });

    describe("with account filters", () => {
      it("filters transactions by single account ID", async () => {
        // Arrange
        const userId = faker.string.uuid();
        const account1 = faker.string.uuid();
        const account2 = faker.string.uuid();

        // Create transactions for different accounts
        await repository.createMany([
          fakeTransaction({ userId, accountId: account1 }),
          fakeTransaction({ userId, accountId: account2 }),
          fakeTransaction({ userId, accountId: account1 }),
        ]);

        // Act
        const result = await repository.findManyByUserIdPaginated(
          userId,
          undefined,
          {
            accountIds: [account1],
          },
        );

        // Assert
        expect(result.edges).toHaveLength(2);
        expect(result.totalCount).toBe(2);
        result.edges.forEach((edge) => {
          expect(edge.node.accountId).toBe(account1);
        });
      });

      it("filters transactions by multiple account IDs", async () => {
        // Arrange
        const userId = faker.string.uuid();
        const account1 = faker.string.uuid();
        const account2 = faker.string.uuid();
        const account3 = faker.string.uuid();

        // Create transactions for three different accounts
        await repository.createMany([
          fakeTransaction({ userId, accountId: account1 }),
          fakeTransaction({ userId, accountId: account2 }),
          fakeTransaction({ userId, accountId: account3 }),
          fakeTransaction({ userId, accountId: account1 }),
        ]);

        // Act - Filter by account1 and account2 (should get 3 transactions)
        const result = await repository.findManyByUserIdPaginated(
          userId,
          undefined,
          {
            accountIds: [account1, account2],
          },
        );

        // Assert
        expect(result.edges).toHaveLength(3);
        expect(result.totalCount).toBe(3);
        const accountIds = result.edges.map((edge) => edge.node.accountId);
        expect(accountIds).toEqual(
          expect.arrayContaining([account1, account1, account2]),
        );
      });

      it("returns empty results when filtering by non-existent account ID", async () => {
        // Arrange
        const userId = faker.string.uuid();
        const account1 = faker.string.uuid();
        const nonExistentAccount = faker.string.uuid();

        await repository.create(
          fakeTransaction({ userId, accountId: account1 }),
        );

        // Act
        const result = await repository.findManyByUserIdPaginated(
          userId,
          undefined,
          {
            accountIds: [nonExistentAccount],
          },
        );

        // Assert
        expect(result.edges).toHaveLength(0);
        expect(result.totalCount).toBe(0);
      });
    });

    describe("with category filters", () => {
      it("filters transactions by single category ID", async () => {
        // Arrange
        const userId = faker.string.uuid();
        const accountId = faker.string.uuid();
        const category1 = faker.string.uuid();
        const category2 = faker.string.uuid();

        // Create transactions for different categories
        await repository.createMany([
          fakeTransaction({
            userId,
            accountId,
            categoryId: category1,
          }),
          fakeTransaction({
            userId,
            accountId,
            categoryId: category2,
          }),
          fakeTransaction({
            userId,
            accountId,
            categoryId: category1,
          }),
        ]);

        // Act
        const result = await repository.findManyByUserIdPaginated(
          userId,
          undefined,
          {
            categoryIds: [category1],
          },
        );

        // Assert
        expect(result.edges).toHaveLength(2);
        expect(result.totalCount).toBe(2);
        result.edges.forEach((edge) => {
          expect(edge.node.categoryId).toBe(category1);
        });
      });

      it("filters transactions by multiple category IDs", async () => {
        // Arrange
        const userId = faker.string.uuid();
        const accountId = faker.string.uuid();
        const category1 = faker.string.uuid();
        const category2 = faker.string.uuid();
        const category3 = faker.string.uuid();

        // Create transactions for three different categories
        await repository.createMany([
          fakeTransaction({
            userId,
            accountId,
            categoryId: category1,
          }),
          fakeTransaction({
            userId,
            accountId,
            categoryId: category2,
          }),
          fakeTransaction({
            userId,
            accountId,
            categoryId: category3,
          }),
        ]);

        // Act - Filter by category1 and category2
        const result = await repository.findManyByUserIdPaginated(
          userId,
          undefined,
          {
            categoryIds: [category1, category2],
          },
        );

        // Assert
        expect(result.edges).toHaveLength(2);
        expect(result.totalCount).toBe(2);
        const categoryIds = result.edges.map((edge) => edge.node.categoryId);
        expect(categoryIds).toEqual(
          expect.arrayContaining([category1, category2]),
        );
      });

      it("includes only uncategorized transactions when includeUncategorized is true and no categoryIds", async () => {
        // Arrange
        const userId = faker.string.uuid();
        const accountId = faker.string.uuid();
        const category1 = faker.string.uuid();

        // Create transactions: some with categories, some without
        await repository.createMany([
          fakeTransaction({
            userId,
            accountId,
            categoryId: category1,
          }),
          fakeTransaction({
            userId,
            accountId,
            categoryId: undefined,
          }),
          fakeTransaction({
            userId,
            accountId,
            categoryId: undefined,
          }),
        ]);

        // Act
        const result = await repository.findManyByUserIdPaginated(
          userId,
          undefined,
          {
            includeUncategorized: true,
          },
        );

        // Assert
        expect(result.edges).toHaveLength(2);
        expect(result.totalCount).toBe(2);
        result.edges.forEach((edge) => {
          expect(edge.node.categoryId).toBeUndefined();
        });
      });

      it("includes both categorized and uncategorized transactions when both filters are provided", async () => {
        // Arrange
        const userId = faker.string.uuid();
        const accountId = faker.string.uuid();
        const category1 = faker.string.uuid();
        const category2 = faker.string.uuid();

        // Create transactions: some with category1, some with category2, some uncategorized
        await repository.createMany([
          fakeTransaction({
            userId,
            accountId,
            categoryId: category1,
          }),
          fakeTransaction({
            userId,
            accountId,
            categoryId: category2,
          }),
          fakeTransaction({
            userId,
            accountId,
            categoryId: undefined,
          }),
          fakeTransaction({
            userId,
            accountId,
            categoryId: category1,
          }),
        ]);

        // Act - Filter by category1 + uncategorized
        const result = await repository.findManyByUserIdPaginated(
          userId,
          undefined,
          {
            categoryIds: [category1],
            includeUncategorized: true,
          },
        );

        // Assert
        expect(result.edges).toHaveLength(3);
        expect(result.totalCount).toBe(3);
        const categoryIds = result.edges.map((edge) => edge.node.categoryId);
        expect(categoryIds.filter((id) => id === category1)).toHaveLength(2);
        expect(categoryIds.filter((id) => id === undefined)).toHaveLength(1);
      });

      it("returns empty results when filtering by non-existent category ID", async () => {
        // Arrange
        const userId = faker.string.uuid();
        const accountId = faker.string.uuid();
        const category1 = faker.string.uuid();
        const nonExistentCategory = faker.string.uuid();

        await repository.create(
          fakeTransaction({
            userId,
            accountId,
            categoryId: category1,
          }),
        );

        // Act
        const result = await repository.findManyByUserIdPaginated(
          userId,
          undefined,
          {
            categoryIds: [nonExistentCategory],
          },
        );

        // Assert
        expect(result.edges).toHaveLength(0);
        expect(result.totalCount).toBe(0);
      });
    });

    describe("with date filters", () => {
      it("filters transactions by dateAfter (inclusive)", async () => {
        // Arrange
        const userId = faker.string.uuid();
        const accountId = faker.string.uuid();

        await repository.createMany([
          fakeTransaction({
            userId,
            accountId,
            date: toDateString("2024-01-10"),
          }),
          fakeTransaction({
            userId,
            accountId,
            date: toDateString("2024-01-15"),
          }),
          fakeTransaction({
            userId,
            accountId,
            date: toDateString("2024-01-20"),
          }),
        ]);

        // Act - Get transactions on or after 2024-01-15 (should include 2024-01-15)
        const result = await repository.findManyByUserIdPaginated(
          userId,
          undefined,
          {
            dateAfter: toDateString("2024-01-15"),
          },
        );

        // Assert - Should include the boundary date (2024-01-15)
        expect(result.edges).toHaveLength(2);
        expect(result.totalCount).toBe(2);
        const dates = result.edges.map((edge) => edge.node.date).sort();
        expect(dates).toEqual(["2024-01-15", "2024-01-20"]);
      });

      it("filters transactions by dateBefore (inclusive)", async () => {
        // Arrange
        const userId = faker.string.uuid();
        const accountId = faker.string.uuid();

        await repository.createMany([
          fakeTransaction({
            userId,
            accountId,
            date: toDateString("2024-01-10"),
          }),
          fakeTransaction({
            userId,
            accountId,
            date: toDateString("2024-01-20"),
          }),
          fakeTransaction({
            userId,
            accountId,
            date: toDateString("2024-01-25"),
          }),
        ]);

        // Act - Get transactions on or before 2024-01-20 (should include 2024-01-20)
        const result = await repository.findManyByUserIdPaginated(
          userId,
          undefined,
          {
            dateBefore: toDateString("2024-01-20"),
          },
        );

        // Assert - Should include the boundary date (2024-01-20)
        expect(result.edges).toHaveLength(2);
        expect(result.totalCount).toBe(2);
        const dates = result.edges.map((edge) => edge.node.date).sort();
        expect(dates).toEqual(["2024-01-10", "2024-01-20"]);
      });

      it("filters transactions by date range (both boundaries inclusive)", async () => {
        // Arrange
        const userId = faker.string.uuid();
        const accountId = faker.string.uuid();

        await repository.createMany([
          fakeTransaction({
            userId,
            accountId,
            date: toDateString("2024-01-05"),
          }),
          fakeTransaction({
            userId,
            accountId,
            date: toDateString("2024-01-10"),
          }),
          fakeTransaction({
            userId,
            accountId,
            date: toDateString("2024-01-15"),
          }),
          fakeTransaction({
            userId,
            accountId,
            date: toDateString("2024-01-20"),
          }),
          fakeTransaction({
            userId,
            accountId,
            date: toDateString("2024-01-25"),
          }),
        ]);

        // Act - Get transactions between 2024-01-10 and 2024-01-20 (both inclusive)
        const result = await repository.findManyByUserIdPaginated(
          userId,
          undefined,
          {
            dateAfter: toDateString("2024-01-10"),
            dateBefore: toDateString("2024-01-20"),
          },
        );

        // Assert - Should include both boundary dates (2024-01-10 and 2024-01-20)
        expect(result.edges).toHaveLength(3);
        expect(result.totalCount).toBe(3);
        const dates = result.edges.map((edge) => edge.node.date).sort();
        expect(dates).toEqual(["2024-01-10", "2024-01-15", "2024-01-20"]);
      });

      it("throws error when dateAfter > dateBefore (DynamoDB constraint)", async () => {
        // Verify DynamoDB constraint behavior when dateAfter > dateBefore
        // DynamoDB BETWEEN operator requires lower bound <= upper bound
        // When this is violated, DynamoDB throws ValidationException
        const userId = faker.string.uuid();
        const accountId = faker.string.uuid();

        await repository.createMany([
          fakeTransaction({
            userId,
            accountId,
            date: toDateString("2024-01-01"),
          }),
          fakeTransaction({
            userId,
            accountId,
            date: toDateString("2024-06-15"),
          }),
          fakeTransaction({
            userId,
            accountId,
            date: toDateString("2024-12-31"),
          }),
        ]);

        // Act & Assert - Should throw error when dateAfter > dateBefore
        await expect(
          repository.findManyByUserIdPaginated(userId, undefined, {
            dateAfter: toDateString("2024-12-31"),
            dateBefore: toDateString("2024-01-01"),
          }),
        ).rejects.toThrow();
      });
    });

    describe("with type filters", () => {
      it("filters transactions by single type", async () => {
        // Arrange
        const userId = faker.string.uuid();
        const accountId = faker.string.uuid();

        await repository.createMany([
          fakeTransaction({
            userId,
            accountId,
            type: TransactionType.INCOME,
          }),
          fakeTransaction({
            userId,
            accountId,
            type: TransactionType.EXPENSE,
          }),
          fakeTransaction({
            userId,
            accountId,
            type: TransactionType.INCOME,
          }),
        ]);

        // Act
        const result = await repository.findManyByUserIdPaginated(
          userId,
          undefined,
          {
            types: [TransactionType.INCOME],
          },
        );

        // Assert
        expect(result.edges).toHaveLength(2);
        expect(result.totalCount).toBe(2);
        result.edges.forEach((edge) => {
          expect(edge.node.type).toBe(TransactionType.INCOME);
        });
      });

      it("filters transactions by multiple types", async () => {
        // Arrange
        const userId = faker.string.uuid();
        const accountId = faker.string.uuid();

        await repository.createMany([
          fakeTransaction({
            userId,
            accountId,
            type: TransactionType.INCOME,
          }),
          fakeTransaction({
            userId,
            accountId,
            type: TransactionType.EXPENSE,
          }),
          fakeTransaction({
            userId,
            accountId,
            type: TransactionType.TRANSFER_IN,
          }),
          fakeTransaction({
            userId,
            accountId,
            type: TransactionType.TRANSFER_OUT,
          }),
        ]);

        // Act
        const result = await repository.findManyByUserIdPaginated(
          userId,
          undefined,
          {
            types: [TransactionType.INCOME, TransactionType.EXPENSE],
          },
        );

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

    describe("with combined filters", () => {
      it("filters by account and date range", async () => {
        // Arrange
        const userId = faker.string.uuid();
        const account1 = faker.string.uuid();
        const account2 = faker.string.uuid();

        await repository.createMany([
          fakeTransaction({
            userId,
            accountId: account1,
            date: toDateString("2024-01-10"),
          }),
          fakeTransaction({
            userId,
            accountId: account1,
            date: toDateString("2024-01-20"),
          }),
          fakeTransaction({
            userId,
            accountId: account2,
            date: toDateString("2024-01-15"),
          }),
          fakeTransaction({
            userId,
            accountId: account2,
            date: toDateString("2024-01-25"),
          }),
        ]);

        // Act
        const result = await repository.findManyByUserIdPaginated(
          userId,
          undefined,
          {
            accountIds: [account1],
            dateAfter: toDateString("2024-01-12"),
            dateBefore: toDateString("2024-01-22"),
          },
        );

        // Assert
        expect(result.edges).toHaveLength(1);
        expect(result.totalCount).toBe(1);
        expect(result.edges[0].node.accountId).toBe(account1);
        expect(result.edges[0].node.date).toBe("2024-01-20");
      });

      it("filters by category and type", async () => {
        // Arrange
        const userId = faker.string.uuid();
        const accountId = faker.string.uuid();
        const category1 = faker.string.uuid();
        const category2 = faker.string.uuid();

        await repository.createMany([
          fakeTransaction({
            userId,
            accountId,
            categoryId: category1,
            type: TransactionType.INCOME,
          }),
          fakeTransaction({
            userId,
            accountId,
            categoryId: category1,
            type: TransactionType.EXPENSE,
          }),
          fakeTransaction({
            userId,
            accountId,
            categoryId: category2,
            type: TransactionType.INCOME,
          }),
          fakeTransaction({
            userId,
            accountId,
            categoryId: category2,
            type: TransactionType.EXPENSE,
          }),
        ]);

        // Act
        const result = await repository.findManyByUserIdPaginated(
          userId,
          undefined,
          {
            categoryIds: [category1],
            types: [TransactionType.EXPENSE],
          },
        );

        // Assert
        expect(result.edges).toHaveLength(1);
        expect(result.totalCount).toBe(1);
        expect(result.edges[0].node.categoryId).toBe(category1);
        expect(result.edges[0].node.type).toBe(TransactionType.EXPENSE);
      });

      it("filters by account, category, date range, and type", async () => {
        // Arrange
        const userId = faker.string.uuid();
        const account1 = faker.string.uuid();
        const account2 = faker.string.uuid();
        const category1 = faker.string.uuid();
        const category2 = faker.string.uuid();

        await repository.createMany([
          fakeTransaction({
            userId,
            accountId: account1,
            categoryId: category1,
            date: toDateString("2024-01-15"),
            type: TransactionType.EXPENSE,
          }),
          fakeTransaction({
            userId,
            accountId: account1,
            categoryId: category1,
            date: toDateString("2024-01-20"),
            type: TransactionType.EXPENSE,
          }),
          fakeTransaction({
            userId,
            accountId: account1,
            categoryId: category2,
            date: toDateString("2024-01-20"),
            type: TransactionType.EXPENSE,
          }),
          fakeTransaction({
            userId,
            accountId: account2,
            categoryId: category1,
            date: toDateString("2024-01-20"),
            type: TransactionType.EXPENSE,
          }),
          fakeTransaction({
            userId,
            accountId: account1,
            categoryId: category1,
            date: toDateString("2024-01-20"),
            type: TransactionType.INCOME,
          }),
          fakeTransaction({
            userId,
            accountId: account1,
            categoryId: category1,
            date: toDateString("2024-01-25"),
            type: TransactionType.EXPENSE,
          }),
        ]);

        // Act - Complex filter: account1 + category1 + date range + EXPENSE type
        const result = await repository.findManyByUserIdPaginated(
          userId,
          undefined,
          {
            accountIds: [account1],
            categoryIds: [category1],
            dateAfter: toDateString("2024-01-18"),
            dateBefore: toDateString("2024-01-22"),
            types: [TransactionType.EXPENSE],
          },
        );

        // Assert - Should only match one transaction
        expect(result.edges).toHaveLength(1);
        expect(result.totalCount).toBe(1);
        expect(result.edges[0].node.accountId).toBe(account1);
        expect(result.edges[0].node.categoryId).toBe(category1);
        expect(result.edges[0].node.date).toBe("2024-01-20");
        expect(result.edges[0].node.type).toBe(TransactionType.EXPENSE);
      });
    });

    describe("pagination with date filters (UserDateIndex)", () => {
      it("paginates correctly when using date filters without duplicates or missing items", async () => {
        // See detailed explanation of the issue here:
        // https://github.com/alexei-lexx/budget/issues/36

        // Arrange - Create 6 transactions across different dates
        const userId = faker.string.uuid();
        const accountId = faker.string.uuid();

        const transactions = [
          fakeTransaction({
            userId,
            accountId,
            date: toDateString("2024-01-20"),
          }),
          fakeTransaction({
            userId,
            accountId,
            date: toDateString("2024-01-19"),
          }),
          fakeTransaction({
            userId,
            accountId,
            date: toDateString("2024-01-18"),
          }),
          fakeTransaction({
            userId,
            accountId,
            date: toDateString("2024-01-17"),
          }),
          fakeTransaction({
            userId,
            accountId,
            date: toDateString("2024-01-16"),
          }),
          fakeTransaction({
            userId,
            accountId,
            date: toDateString("2024-01-15"),
          }),
        ];
        await repository.createMany(transactions);

        // Act - Fetch first page with date filter (triggers UserDateIndex usage)
        const page1 = await repository.findManyByUserIdPaginated(
          userId,
          { first: 3 }, // Get 3 items per page
          {
            dateAfter: toDateString("2024-01-01"),
            dateBefore: toDateString("2024-01-31"),
          },
        );

        // Assert - Page 1 should have 3 items and indicate more pages
        expect(page1.edges).toHaveLength(3);
        expect(page1.pageInfo.hasNextPage).toBe(true);
        expect(page1.pageInfo.endCursor).toBeDefined();
        expect(page1.totalCount).toBe(6);

        // Act - Fetch second page using cursor from page 1
        const page2 = await repository.findManyByUserIdPaginated(
          userId,
          { first: 3, after: page1.pageInfo.endCursor },
          {
            dateAfter: toDateString("2024-01-01"),
            dateBefore: toDateString("2024-01-31"),
          },
        );

        // Assert - Page 2 should have remaining 3 items
        expect(page2.edges).toHaveLength(3);
        // Note: hasNextPage may be true due to DynamoDB pagination behavior (returns LastEvaluatedKey when Limit is reached)
        // This is acceptable as long as there are no duplicates or missing items
        expect(page2.totalCount).toBe(6);

        // CRITICAL: Verify no duplicates between pages
        const page1Ids = page1.edges.map((edge) => edge.node.id);
        const page2Ids = page2.edges.map((edge) => edge.node.id);
        const duplicates = page1Ids.filter((id) => page2Ids.includes(id));
        expect(duplicates).toHaveLength(0);

        // CRITICAL: Verify all transactions are present (no missing items)
        const allPagedIds = [...page1Ids, ...page2Ids];
        const expectedIds = transactions.map((transaction) => transaction.id);
        expect(allPagedIds.sort()).toEqual(expectedIds.sort());

        // Verify correct ordering (newest first: 2024-01-20 -> 2024-01-15)
        expect(page1.edges[0].node.date).toBe("2024-01-20");
        expect(page1.edges[1].node.date).toBe("2024-01-19");
        expect(page1.edges[2].node.date).toBe("2024-01-18");
        expect(page2.edges[0].node.date).toBe("2024-01-17");
        expect(page2.edges[1].node.date).toBe("2024-01-16");
        expect(page2.edges[2].node.date).toBe("2024-01-15");
      });
    });

    describe("pagination without date filters (UserCreatedAtIndex)", () => {
      it("paginates correctly without date filters", async () => {
        // Arrange - Create 6 transactions
        const userId = faker.string.uuid();
        const accountId = faker.string.uuid();

        const transactions = [
          fakeTransaction({
            userId,
            accountId,
            date: toDateString("2024-01-20"),
          }),
          fakeTransaction({
            userId,
            accountId,
            date: toDateString("2024-01-19"),
          }),
          fakeTransaction({
            userId,
            accountId,
            date: toDateString("2024-01-18"),
          }),
          fakeTransaction({
            userId,
            accountId,
            date: toDateString("2024-01-17"),
          }),
          fakeTransaction({
            userId,
            accountId,
            date: toDateString("2024-01-16"),
          }),
          fakeTransaction({
            userId,
            accountId,
            date: toDateString("2024-01-15"),
          }),
        ];
        await repository.createMany(transactions);

        // Act - Fetch first page WITHOUT date filter (triggers UserCreatedAtIndex usage)
        const page1 = await repository.findManyByUserIdPaginated(
          userId,
          { first: 3 }, // Get 3 items per page
          {}, // No filters - should use UserCreatedAtIndex
        );

        // Assert - Page 1 should have 3 items
        expect(page1.edges).toHaveLength(3);
        expect(page1.pageInfo.hasNextPage).toBe(true);
        expect(page1.pageInfo.endCursor).toBeDefined();
        expect(page1.totalCount).toBe(6);

        // Act - Fetch second page using cursor
        const page2 = await repository.findManyByUserIdPaginated(
          userId,
          { first: 3, after: page1.pageInfo.endCursor },
          {}, // No filters
        );

        // Assert - Page 2 should have remaining 3 items
        expect(page2.edges).toHaveLength(3);
        expect(page2.totalCount).toBe(6);

        // CRITICAL: Verify no duplicates between pages
        const page1Ids = page1.edges.map((edge) => edge.node.id);
        const page2Ids = page2.edges.map((edge) => edge.node.id);
        const duplicates = page1Ids.filter((id) => page2Ids.includes(id));
        expect(duplicates).toHaveLength(0);

        // CRITICAL: Verify all transactions are present (no missing items)
        const allPagedIds = [...page1Ids, ...page2Ids];
        const expectedIds = transactions.map((transaction) => transaction.id);
        expect(allPagedIds.sort()).toEqual(expectedIds.sort());
      });
    });
  });

  describe("cursor validation - error handling", () => {
    it("throws error for invalid base64 cursor format", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const invalidCursor = "not-valid-base64!!!";

      // Act & Assert
      await expect(
        repository.findManyByUserIdPaginated(userId, {
          first: 10,
          after: invalidCursor,
        }),
      ).rejects.toThrow("Invalid cursor format");
    });

    it("throws error for corrupted JSON in cursor", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const corruptedCursor =
        Buffer.from("{ invalid json }").toString("base64");

      // Act & Assert
      await expect(
        repository.findManyByUserIdPaginated(userId, {
          first: 10,
          after: corruptedCursor,
        }),
      ).rejects.toThrow("Invalid cursor format");
    });

    it("throws error for missing createdAtSortable field in cursor", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const cursorWithoutCreatedAtSortable = Buffer.from(
        JSON.stringify({ date: "2024-01-20", id: "abc-123" }),
      ).toString("base64");

      // Act & Assert
      await expect(
        repository.findManyByUserIdPaginated(userId, {
          first: 10,
          after: cursorWithoutCreatedAtSortable,
        }),
      ).rejects.toThrow("Invalid cursor format");
    });

    it("throws error for missing date field in cursor", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const cursorWithoutDate = Buffer.from(
        JSON.stringify({
          createdAtSortable: "2024-01-20T10:00:00.000Z#some-ulid",
          id: "abc-123",
        }),
      ).toString("base64");

      // Act & Assert
      await expect(
        repository.findManyByUserIdPaginated(userId, {
          first: 10,
          after: cursorWithoutDate,
        }),
      ).rejects.toThrow("Invalid cursor format");
    });

    it("throws error for missing id field in cursor", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const cursorWithoutId = Buffer.from(
        JSON.stringify({
          createdAtSortable: "2024-01-20T10:00:00.000Z#some-ulid",
          date: "2024-01-20",
        }),
      ).toString("base64");

      // Act & Assert
      await expect(
        repository.findManyByUserIdPaginated(userId, {
          first: 10,
          after: cursorWithoutId,
        }),
      ).rejects.toThrow("Invalid cursor format");
    });
  });

  describe("findManyByDescription", () => {
    it("returns transactions that contain search text (case-sensitive)", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      // Create transactions individually with delays to ensure proper ordering
      await repository.create(
        fakeTransaction({
          userId,
          accountId,
          description: "Grocery store",
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      await repository.create(
        fakeTransaction({
          userId,
          accountId,
          description: "Grocery shopping",
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      await repository.create(
        fakeTransaction({
          userId,
          accountId,
          description: "Gas station",
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      await repository.create(
        fakeTransaction({
          userId,
          accountId,
          description: "Restaurant meal",
        }),
      );

      // Act
      const result = await repository.findManyByDescription({
        userId,
        searchText: "Gr",
        limit: 10,
      });

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].description).toBe("Grocery shopping"); // Most recent first
      expect(result[1].description).toBe("Grocery store");
    });

    it("is case-sensitive in matching", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      const transactions = [
        fakeTransaction({
          userId,
          accountId,
          description: "Grocery store",
        }),
        fakeTransaction({
          userId,
          accountId,
          description: "grocery shopping",
        }),
      ];

      await repository.createMany(transactions);

      // Act - Search with uppercase "G"
      const resultUppercase = await repository.findManyByDescription({
        userId,
        searchText: "Gr",
        limit: 10,
      });

      // Act - Search with lowercase "g"
      const resultLowercase = await repository.findManyByDescription({
        userId,
        searchText: "gr",
        limit: 10,
      });

      // Assert
      expect(resultUppercase).toHaveLength(1);
      expect(resultUppercase[0].description).toBe("Grocery store");

      expect(resultLowercase).toHaveLength(1);
      expect(resultLowercase[0].description).toBe("grocery shopping");
    });

    it("returns results ordered by creation time (most recent first)", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      // Create transactions with a delay to ensure different creation times
      const transaction1 = fakeTransaction({
        userId,
        accountId,
        description: "Store purchase 1",
      });
      await repository.create(transaction1);

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const transaction2 = fakeTransaction({
        userId,
        accountId,
        description: "Store purchase 2",
      });
      await repository.create(transaction2);

      // Act
      const result = await repository.findManyByDescription({
        userId,
        searchText: "Store",
        limit: 10,
      });

      // Assert - Should be ordered by creation time (newest first)
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(transaction2.id);
      expect(result[1].id).toBe(transaction1.id);
    });

    it("respects limit parameter", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      const transactions = [];
      for (let i = 1; i <= 3; i++) {
        transactions.push(
          fakeTransaction({
            userId,
            accountId,
            description: `Store transaction ${i}`,
          }),
        );
      }

      await repository.createMany(transactions);

      // Act
      const result = await repository.findManyByDescription({
        userId,
        searchText: "Store",
        limit: 2,
      });

      // Assert
      expect(result).toHaveLength(2);
    });

    it("excludes transactions without descriptions", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      const transactions = [
        fakeTransaction({
          userId,
          accountId,
          description: "Grocery store",
        }),
        fakeTransaction({
          userId,
          accountId,
          description: undefined, // No description
        }),
      ];

      await repository.createMany(transactions);

      // Act
      const result = await repository.findManyByDescription({
        userId,
        searchText: "store",
        limit: 10,
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe("Grocery store");
    });

    it("excludes archived transactions", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      const transactions = [
        fakeTransaction({
          userId,
          accountId,
          description: "Store purchase 1",
          isArchived: true,
        }),
        fakeTransaction({
          userId,
          accountId,
          description: "Store purchase 2",
        }),
      ];

      await repository.createMany(transactions);

      // Act
      const result = await repository.findManyByDescription({
        userId,
        searchText: "Store",
        limit: 10,
      });

      // Assert - Should only return non-archived transaction
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe("Store purchase 2");
    });

    it("isolates results by user", async () => {
      // Arrange
      const user1 = faker.string.uuid();
      const user2 = faker.string.uuid();
      const accountId = faker.string.uuid();

      const transactions = [
        fakeTransaction({
          userId: user1,
          accountId,
          description: "User 1 store",
        }),
        fakeTransaction({
          userId: user2,
          accountId,
          description: "User 2 store",
        }),
      ];

      await repository.createMany(transactions);

      // Act
      const user1Result = await repository.findManyByDescription({
        userId: user1,
        searchText: "store",
        limit: 10,
      });
      const user2Result = await repository.findManyByDescription({
        userId: user2,
        searchText: "store",
        limit: 10,
      });

      // Assert - Each user sees only their own transactions
      expect(user1Result).toHaveLength(1);
      expect(user1Result[0].description).toBe("User 1 store");
      expect(user1Result[0].userId).toBe(user1);

      expect(user2Result).toHaveLength(1);
      expect(user2Result[0].description).toBe("User 2 store");
      expect(user2Result[0].userId).toBe(user2);
    });

    it("returns empty array for empty search text", async () => {
      // Arrange
      const userId = faker.string.uuid();

      await repository.create(
        fakeTransaction({
          userId,
          description: "Grocery store",
        }),
      );

      // Act
      const result = await repository.findManyByDescription({
        userId,
        searchText: "",
        limit: 10,
      });

      // Assert
      expect(result).toHaveLength(0);
    });

    it("returns empty array when no matches found", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      const transactions = [
        fakeTransaction({
          userId,
          accountId,
          description: "Grocery store",
        }),
      ];

      await repository.createMany(transactions);

      // Act
      const result = await repository.findManyByDescription({
        userId,
        searchText: "xyz",
        limit: 10,
      });

      // Assert
      expect(result).toHaveLength(0);
    });

    it("returns empty array for user with no transactions", async () => {
      // Arrange
      const userId = faker.string.uuid();

      // Act
      const result = await repository.findManyByDescription({
        userId,
        searchText: "store",
        limit: 10,
      });

      // Assert
      expect(result).toHaveLength(0);
    });

    it("throws error for missing user ID", async () => {
      // Act & Assert
      await expect(
        repository.findManyByDescription({
          userId: "",
          searchText: "store",
          limit: 10,
        }),
      ).rejects.toThrow("User ID is required");
    });

    it("throws error for invalid limit parameter", async () => {
      // Arrange
      const userId = faker.string.uuid();

      // Act & Assert - Zero limit
      await expect(
        repository.findManyByDescription({
          userId,
          searchText: "store",
          limit: 0,
        }),
      ).rejects.toThrow("Limit must be a positive integer");

      // Act & Assert - Negative limit
      await expect(
        repository.findManyByDescription({
          userId,
          searchText: "store",
          limit: -1,
        }),
      ).rejects.toThrow("Limit must be a positive integer");

      // Act & Assert - Non-integer limit
      await expect(
        repository.findManyByDescription({
          userId,
          searchText: "store",
          limit: 3.5,
        }),
      ).rejects.toThrow("Limit must be a positive integer");
    });

    it("handles exact string matches", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      const transactions = [
        fakeTransaction({
          userId,
          accountId,
          description: "Exact match",
        }),
        fakeTransaction({
          userId,
          accountId,
          description: "Not a match",
        }),
      ];

      await repository.createMany(transactions);

      // Act
      const result = await repository.findManyByDescription({
        userId,
        searchText: "Exact match",
        limit: 10,
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe("Exact match");
    });

    it("handles substring matches", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();

      const transactions = [
        fakeTransaction({
          userId,
          accountId,
          description: "This is a long description with multiple words",
        }),
        fakeTransaction({
          userId,
          accountId,
          description: "Short desc",
        }),
      ];

      await repository.createMany(transactions);

      // Act
      const result = await repository.findManyByDescription({
        userId,
        searchText: "long description",
        limit: 10,
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe(
        "This is a long description with multiple words",
      );
    });
  });

  describe("create", () => {
    // Happy path

    it("persists pre-built transaction and returns it unchanged", async () => {
      // Arrange
      const transaction = fakeTransaction();

      // Act
      await repository.create(transaction);

      // Assert
      const stored = await repository.findOneById({
        id: transaction.id,
        userId: transaction.userId,
      });
      expect(stored).toEqual(transaction);
    });

    it("persists transaction without optional fields", async () => {
      // Arrange
      const transaction = fakeTransaction({
        categoryId: undefined,
        description: undefined,
        transferId: undefined,
      });

      // Act
      await repository.create(transaction);

      // Assert
      const stored = await repository.findOneById({
        id: transaction.id,
        userId: transaction.userId,
      });
      expect(stored).toEqual(transaction);
    });

    it("includes createdAtSortable in raw DynamoDB item", async () => {
      // Arrange
      const transaction = fakeTransaction();

      // Act
      await repository.create(transaction);

      // Assert
      const client = createDynamoDBDocumentClient();
      const { Item: rawItem } = await client.send(
        new GetCommand({
          TableName: tableName,
          Key: { userId: transaction.userId, id: transaction.id },
        }),
      );

      expect(rawItem).toBeDefined();
      expect(rawItem?.createdAtSortable).toMatch(
        new RegExp(`^${transaction.createdAt}#.+`),
      );
    });

    it("persists version = 0", async () => {
      // Arrange
      const transaction = fakeTransaction({ version: 0 });

      // Act
      await repository.create(transaction);

      // Assert
      const loaded = await repository.findOneById({
        id: transaction.id,
        userId: transaction.userId,
      });
      expect(loaded?.version).toBe(0);
    });

    // Validation failures

    it("rejects when transaction with same ID already exists", async () => {
      // Arrange
      const transaction = fakeTransaction();
      await repository.create(transaction);

      const duplicate = fakeTransaction({
        id: transaction.id,
        userId: transaction.userId,
      });

      // Act & Assert
      await expect(repository.create(duplicate)).rejects.toMatchObject({
        code: "CREATE_FAILED",
        message: "Transaction with this ID already exists",
      });
    });
  });

  describe("createMany", () => {
    // Happy path

    it("creates multiple transactions", async () => {
      // Arrange
      const userId1 = faker.string.uuid();
      const userId2 = faker.string.uuid();
      const inputs: Transaction[] = [
        fakeTransaction({
          userId: userId1,
          type: TransactionType.INCOME,
          amount: 300.0,
          currency: "USD",
          date: toDateString("2024-01-18"),
        }),
        fakeTransaction({
          userId: userId2,
          type: TransactionType.EXPENSE,
          amount: 150.0,
          currency: "EUR",
          date: toDateString("2024-01-19"),
        }),
      ];

      // Act
      await repository.createMany(inputs);

      // Assert
      const stored1 = await repository.findOneById({
        id: inputs[0].id,
        userId: userId1,
      });
      const stored2 = await repository.findOneById({
        id: inputs[1].id,
        userId: userId2,
      });

      expect(stored1).toEqual(inputs[0]);
      expect(stored2).toEqual(inputs[1]);
    });

    it("includes createdAtSortable in raw DynamoDB items", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const inputs = [fakeTransaction({ userId }), fakeTransaction({ userId })];

      // Act
      await repository.createMany(inputs);

      // Assert
      const client = createDynamoDBDocumentClient();
      const ids = inputs.map((transaction) => transaction.id);

      const { Responses: responses } = await client.send(
        new BatchGetCommand({
          RequestItems: {
            [tableName]: {
              Keys: ids.map((id) => ({
                userId,
                id,
              })),
            },
          },
        }),
      );

      const rawItems = responses ? responses[tableName] : [];

      expect(rawItems.length).toBe(2);
      expect(rawItems[0]).toHaveProperty("createdAtSortable");
      expect(rawItems[1]).toHaveProperty("createdAtSortable");
    });

    it("orders paired transfers TRANSFER_IN before TRANSFER_OUT", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const transferId = faker.string.uuid();

      // Act - create paired transfer transactions
      await repository.createMany([
        fakeTransaction({
          userId,
          type: TransactionType.TRANSFER_OUT,
          transferId,
        }),
        fakeTransaction({
          userId,
          type: TransactionType.TRANSFER_IN,
          transferId,
        }),
      ]);

      // Assert - descending order (newest first) places TRANSFER_IN first
      const result = await repository.findManyByUserIdPaginated(userId);
      expect(result.edges[0].node.type).toBe(TransactionType.TRANSFER_IN);
      expect(result.edges[1].node.type).toBe(TransactionType.TRANSFER_OUT);
    });

    it("persists version = 0 on every transaction", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const inputs = [
        fakeTransaction({ userId, version: 0 }),
        fakeTransaction({ userId, version: 0 }),
      ];

      // Act
      await repository.createMany(inputs);

      // Assert
      const [loaded1, loaded2] = await Promise.all([
        repository.findOneById({ id: inputs[0].id, userId }),
        repository.findOneById({ id: inputs[1].id, userId }),
      ]);
      expect(loaded1?.version).toBe(0);
      expect(loaded2?.version).toBe(0);
    });

    // Validation failures

    it("throws for empty input", async () => {
      // Arrange
      const inputs: Transaction[] = [];

      // Act & Assert
      await expect(repository.createMany(inputs)).rejects.toThrow(
        "At least one transaction is required",
      );
    });

    it("rejects when any transaction has duplicate ID", async () => {
      // Arrange
      const existing = fakeTransaction();
      await repository.create(existing);

      const duplicate = fakeTransaction({
        id: existing.id,
        userId: existing.userId,
      });
      const fresh = fakeTransaction();

      // Act
      const promise = repository.createMany([fresh, duplicate]);

      // Assert
      await expect(promise).rejects.toMatchObject({
        code: "CREATE_FAILED",
        message: "Transaction with this ID already exists",
      });

      // Fresh transaction must not persist (atomic rollback)
      const stored = await repository.findOneById({
        id: fresh.id,
        userId: fresh.userId,
      });
      expect(stored).toBeNull();
    });
  });

  describe("update", () => {
    // Happy path

    it("persists every field on passed Transaction", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const created = fakeTransaction({
        userId,
        type: TransactionType.EXPENSE,
        amount: 75.0,
        currency: "USD",
        date: toDateString("2024-01-20"),
        description: "Original description",
        categoryId: faker.string.uuid(),
      });
      await repository.create(created);

      // Act
      const updated = await repository.update(
        TransactionEntity.fromPersistence({
          ...created.toData(),
          accountId: faker.string.uuid(),
          categoryId: faker.string.uuid(),
          type: TransactionType.INCOME,
          amount: 100.0,
          currency: "EUR",
          date: toDateString("2024-02-01"),
          description: "Updated description",
          updatedAt: new Date().toISOString(),
        }),
      );

      // Assert
      const stored = await repository.findOneById({
        id: created.id,
        userId,
      });
      expect(stored).toEqual(updated);
    });

    it("increments version by 1", async () => {
      // Arrange
      const created = fakeTransaction();
      await repository.create(created);

      // Act
      const updated = await repository.update(
        TransactionEntity.fromPersistence({ ...created.toData(), amount: 50 }),
      );

      // Assert
      expect(updated.version).toBe(created.version + 1);

      const stored = await repository.findOneById({
        id: created.id,
        userId: created.userId,
      });
      expect(stored?.version).toBe(updated.version);
    });

    it("removes optional fields when undefined on Transaction", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const created = fakeTransaction({
        userId,
        description: "Test description",
        categoryId: faker.string.uuid(),
      });
      await repository.create(created);

      // Act
      await repository.update(
        TransactionEntity.fromPersistence({
          ...created.toData(),
          description: undefined,
          categoryId: undefined,
          updatedAt: new Date().toISOString(),
        }),
      );

      // Assert
      const stored = await repository.findOneById({
        id: created.id,
        userId,
      });
      expect(stored?.description).toBeUndefined();
      expect(stored?.categoryId).toBeUndefined();
    });

    it("preserves createdAtSortable GSI sort key across updates", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const created = fakeTransaction({ userId });
      await repository.create(created);

      const client = createDynamoDBDocumentClient();
      const { Item: before } = await client.send(
        new GetCommand({
          TableName: tableName,
          Key: { userId, id: created.id },
        }),
      );

      // Act
      await repository.update(
        TransactionEntity.fromPersistence({
          ...created.toData(),
          amount: 999,
          updatedAt: new Date().toISOString(),
        }),
      );

      // Assert
      const { Item: after } = await client.send(
        new GetCommand({
          TableName: tableName,
          Key: { userId, id: created.id },
        }),
      );
      expect(after?.createdAtSortable).toBe(before?.createdAtSortable);
    });

    // Validation failures

    it("throws VersionConflictError when version is stale", async () => {
      // Arrange — row at v0, then bumped to v1 by a first update
      const created = fakeTransaction({ version: 0 });
      await repository.create(created);
      await repository.update(
        TransactionEntity.fromPersistence({ ...created.toData(), amount: 50 }),
      );

      // Stale write expects v0 but disk is at v1
      const staleUpdate = TransactionEntity.fromPersistence({
        ...created.toData(),
        amount: 99,
      });

      // Act & Assert
      await expect(repository.update(staleUpdate)).rejects.toThrow(
        VersionConflictError,
      );
    });

    it("throws NOT_FOUND when transaction does not exist", async () => {
      // Arrange
      const transaction = fakeTransaction();

      // Act & Assert
      await expect(repository.update(transaction)).rejects.toThrow(
        "Transaction not found",
      );
    });

    it("throws NOT_FOUND when userId does not match", async () => {
      // Arrange
      const owner = faker.string.uuid();
      const other = faker.string.uuid();
      const created = fakeTransaction({ userId: owner });
      await repository.create(created);

      // Act & Assert - Write as different user, partition key mismatch => condition fails
      await expect(
        repository.update(
          TransactionEntity.fromPersistence({
            ...created.toData(),
            userId: other,
          }),
        ),
      ).rejects.toThrow("Transaction not found");

      // Verify original transaction is unchanged
      const original = await repository.findOneById({
        id: created.id,
        userId: owner,
      });
      expect(original).toEqual(created);
    });
  });

  describe("updateMany", () => {
    // Happy path

    it("updates multiple transactions atomically", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const transactions = [
        fakeTransaction({ userId, amount: 300.0 }),
        fakeTransaction({ userId, amount: 150.0 }),
      ];
      await repository.createMany(transactions);

      // Act
      const updatedTransactions = await repository.updateMany(
        transactions.map((transaction) =>
          TransactionEntity.fromPersistence({
            ...transaction.toData(),
            amount: transaction.amount + 100,
            description: "Updated",
            updatedAt: new Date().toISOString(),
          }),
        ),
      );

      // Assert
      for (const updatedTransaction of updatedTransactions) {
        const stored = await repository.findOneById({
          id: updatedTransaction.id,
          userId,
        });
        expect(stored).toEqual(updatedTransaction);
      }
    });

    it("increments version by 1 on every transaction", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const transactions = [
        fakeTransaction({ userId, version: 0 }),
        fakeTransaction({ userId, version: 0 }),
      ];
      await repository.createMany(transactions);

      // Act
      const updated = await repository.updateMany(
        transactions.map((transaction) =>
          TransactionEntity.fromPersistence({
            ...transaction.toData(),
            amount: 50,
          }),
        ),
      );

      // Assert
      expect(updated[0].version).toBe(1);
      expect(updated[1].version).toBe(1);
    });

    // Validation failures

    it("throws error for empty input array", async () => {
      // Act & Assert
      await expect(repository.updateMany([])).rejects.toThrow(
        "At least one transaction is required",
      );
    });

    it("throws VersionConflictError when any transaction has stale version", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const transaction1 = fakeTransaction({ userId, version: 1 });
      const transaction2 = fakeTransaction({ userId, version: 2 });
      await repository.create(transaction1);
      await repository.create(transaction2);

      // Act & Assert
      await expect(
        repository.updateMany([
          TransactionEntity.fromPersistence({
            ...transaction1.toData(),
            amount: 11,
          }),
          // transaction2 is stale because current version is 2, update assumes it's 1
          TransactionEntity.fromPersistence({
            ...transaction2.toData(),
            amount: 22,
            version: 1,
          }),
        ]),
      ).rejects.toThrow(VersionConflictError);

      // Atomicity — both transactions must remain at original version
      const loaded1 = await repository.findOneById({
        id: transaction1.id,
        userId,
      });
      expect(loaded1?.version).toBe(1);

      const loaded2 = await repository.findOneById({
        id: transaction2.id,
        userId,
      });
      expect(loaded2?.version).toBe(2);
    });

    it("throws NOT_FOUND when any transaction does not exist", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const existing = fakeTransaction({ userId, version: 0 });
      await repository.create(existing);

      const missing = fakeTransaction({ userId, version: 0 });

      // Act
      const promise = repository.updateMany([
        TransactionEntity.fromPersistence({
          ...existing.toData(),
          amount: 999,
          updatedAt: new Date().toISOString(),
        }),
        missing,
      ]);

      // Assert
      await expect(promise).rejects.toThrow(
        "One or more transactions not found",
      );

      // Atomic rollback — the existing transaction was not modified
      const stored = await repository.findOneById({
        id: existing.id,
        userId,
      });
      expect(stored).toEqual(existing);
    });
  });

  describe("detectPatterns", () => {
    it("returns empty array for new user with no transactions", async () => {
      // Arrange
      const userId = faker.string.uuid();

      // Act
      const result = await repository.detectPatterns({
        userId,
        type: TransactionPatternType.INCOME,
        limit: 3,
        sampleSize: 100,
      });

      // Assert
      expect(result).toEqual([]);
    });

    it("returns empty array when no transactions have category", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const transactions = [
        fakeTransaction({
          userId,
          categoryId: undefined,
          type: TransactionType.INCOME,
        }),
        fakeTransaction({
          userId,
          categoryId: undefined,
          type: TransactionType.INCOME,
        }),
      ];

      await repository.createMany(transactions);

      // Act
      const result = await repository.detectPatterns({
        userId,
        type: TransactionPatternType.INCOME,
        limit: 3,
        sampleSize: 100,
      });

      // Assert
      expect(result).toEqual([]);
    });

    it("returns patterns sorted by usage count descending", async () => {
      const userId = faker.string.uuid();
      const account1 = faker.string.uuid();
      const category1 = faker.string.uuid();
      const account2 = faker.string.uuid();
      const category2 = faker.string.uuid();
      const account3 = faker.string.uuid();
      const category3 = faker.string.uuid();

      const transactions = [
        // Pattern 1: account1 + category1 (3 occurrences)
        fakeTransaction({
          userId,
          accountId: account1,
          categoryId: category1,
          type: TransactionType.INCOME,
        }),

        fakeTransaction({
          userId,
          accountId: account1,
          categoryId: category1,
          type: TransactionType.INCOME,
        }),
        fakeTransaction({
          userId,
          accountId: account1,
          categoryId: category1,
          type: TransactionType.INCOME,
        }),
        // Pattern 2: account2 + category2 (2 occurrences)
        fakeTransaction({
          userId,
          accountId: account2,
          categoryId: category2,
          type: TransactionType.INCOME,
        }),
        fakeTransaction({
          userId,
          accountId: account2,
          categoryId: category2,
          type: TransactionType.INCOME,
        }),
        // Pattern 3: account3 + category3 (1 occurrence)
        fakeTransaction({
          userId,
          accountId: account3,
          categoryId: category3,
          type: TransactionType.INCOME,
        }),
      ];

      await repository.createMany(transactions);

      const result = await repository.detectPatterns({
        userId,
        type: TransactionPatternType.INCOME,
        limit: 3,
        sampleSize: 100,
      });

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

    it("returns only top N patterns based on limit", async () => {
      const userId = faker.string.uuid();
      const transactions = [];

      // Create account/category IDs as proper UUIDs
      const accountIds = Array.from({ length: 5 }, () => faker.string.uuid());
      const categoryIds = Array.from({ length: 5 }, () => faker.string.uuid());

      // Create 5 different patterns with different usage counts
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j <= i; j++) {
          transactions.push(
            fakeTransaction({
              userId,
              accountId: accountIds[i],
              categoryId: categoryIds[i],
              type: TransactionType.EXPENSE,
            }),
          );
        }
      }

      await repository.createMany(transactions);

      const result = await repository.detectPatterns({
        userId,
        type: TransactionPatternType.EXPENSE,
        limit: 3,
        sampleSize: 100,
      });

      // Assert - Should return only top 3 patterns, sorted by frequency (most used first)
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        accountId: accountIds[4],
        categoryId: categoryIds[4],
      }); // Most frequent (5 uses)
      expect(result[1]).toEqual({
        accountId: accountIds[3],
        categoryId: categoryIds[3],
      }); // Second most frequent (4 uses)
      expect(result[2]).toEqual({
        accountId: accountIds[2],
        categoryId: categoryIds[2],
      }); // Third most frequent (3 uses)
    });

    it("sorts deterministically when usage counts are equal", async () => {
      const userId = faker.string.uuid();
      // Generate UUIDs and sort them so we can predict the deterministic sort order
      // Using proper UUID v4 format with correct version (4) and variant (8-b) bits
      const accountA = "11111111-1111-4111-8111-111111111111";
      const accountB = "22222222-2222-4222-8222-222222222222";
      const categoryA = "11111111-1111-4111-8111-111111111111";
      const categoryB = "22222222-2222-4222-8222-222222222222";
      const categoryC = "33333333-3333-4333-8333-333333333333";

      const transactions = [
        // Pattern 1: accountB + categoryB (2 occurrences)
        fakeTransaction({
          userId,
          accountId: accountB,
          categoryId: categoryB,
          type: TransactionType.INCOME,
          amount: 100.0,
          currency: "USD",
        }),
        fakeTransaction({
          userId,
          accountId: accountB,
          categoryId: categoryB,
          type: TransactionType.INCOME,
          amount: 150.0,
          currency: "USD",
        }),
        // Pattern 2: accountA + categoryA (2 occurrences, same count)
        fakeTransaction({
          userId,
          accountId: accountA,
          categoryId: categoryA,
          type: TransactionType.INCOME,
        }),
        fakeTransaction({
          userId,
          accountId: accountA,
          categoryId: categoryA,
          type: TransactionType.INCOME,
        }),
        // Pattern 3: accountA + categoryC (2 occurrences, same account different category)
        fakeTransaction({
          userId,
          accountId: accountA,
          categoryId: categoryC,
          type: TransactionType.INCOME,
        }),
        fakeTransaction({
          userId,
          accountId: accountA,
          categoryId: categoryC,
          type: TransactionType.INCOME,
        }),
      ];

      await repository.createMany(transactions);

      const result = await repository.detectPatterns({
        userId,
        type: TransactionPatternType.INCOME,
        limit: 3,
        sampleSize: 100,
      });

      // Assert - Should sort deterministically by accountId, then categoryId
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        accountId: accountA,
        categoryId: categoryA,
      });
      expect(result[1]).toEqual({
        accountId: accountA,
        categoryId: categoryC,
      });
      expect(result[2]).toEqual({
        accountId: accountB,
        categoryId: categoryB,
      });
    });

    it("filters by transaction type correctly", async () => {
      const userId = faker.string.uuid();
      const accountId = faker.string.uuid();
      const categoryIncome = faker.string.uuid();
      const categoryExpense = faker.string.uuid();
      const categoryRefund = faker.string.uuid();
      const categoryTransfer = faker.string.uuid();

      const transactions = [
        // Income transactions
        fakeTransaction({
          userId,
          accountId,
          categoryId: categoryIncome,
          type: TransactionType.INCOME,
        }),
        fakeTransaction({
          userId,
          accountId,
          categoryId: categoryIncome,
          type: TransactionType.INCOME,
        }),
        // Expense transactions
        fakeTransaction({
          userId,
          accountId,
          categoryId: categoryExpense,
          type: TransactionType.EXPENSE,
        }),
        fakeTransaction({
          userId,
          accountId,
          categoryId: categoryExpense,
          type: TransactionType.EXPENSE,
        }),
        // Refund transactions
        fakeTransaction({
          userId,
          accountId,
          categoryId: categoryRefund,
          type: TransactionType.REFUND,
        }),
        fakeTransaction({
          userId,
          accountId,
          categoryId: categoryRefund,
          type: TransactionType.REFUND,
        }),
        // Transfer transactions (should be excluded)
        fakeTransaction({
          userId,
          accountId,
          categoryId: categoryTransfer,
          type: TransactionType.TRANSFER_IN,
        }),
      ];

      await repository.createMany(transactions);

      const incomeResult = await repository.detectPatterns({
        userId,
        type: TransactionPatternType.INCOME,
        limit: 3,
        sampleSize: 100,
      });

      const expenseResult = await repository.detectPatterns({
        userId,
        type: TransactionPatternType.EXPENSE,
        limit: 3,
        sampleSize: 100,
      });

      const refundResult = await repository.detectPatterns({
        userId,
        type: TransactionPatternType.REFUND,
        limit: 3,
        sampleSize: 100,
      });

      expect(incomeResult).toHaveLength(1);
      expect(incomeResult[0]).toEqual({
        accountId,
        categoryId: categoryIncome,
      });

      // Assert - Expense patterns
      expect(expenseResult).toHaveLength(1);
      expect(expenseResult[0]).toEqual({
        accountId,
        categoryId: categoryExpense,
      });

      // Assert - Refund patterns
      expect(refundResult).toHaveLength(1);
      expect(refundResult[0]).toEqual({
        accountId,
        categoryId: categoryRefund,
      });
    });

    it("excludes archived transactions", async () => {
      const userId = faker.string.uuid();
      const account1 = faker.string.uuid();
      const category1 = faker.string.uuid();
      const account2 = faker.string.uuid();
      const category2 = faker.string.uuid();

      const transactions = [
        fakeTransaction({
          userId,
          accountId: account1,
          categoryId: category1,
          type: TransactionType.INCOME,
          isArchived: true,
        }),
        fakeTransaction({
          userId,
          accountId: account2,
          categoryId: category2,
          type: TransactionType.INCOME,
        }),
      ];

      await repository.createMany(transactions);

      const result = await repository.detectPatterns({
        userId,
        type: TransactionPatternType.INCOME,
        limit: 3,
        sampleSize: 100,
      });

      // Assert - Should only count non-archived transaction
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        accountId: account2,
        categoryId: category2,
      });
    });

    it("respects sample size limit", async () => {
      const userId = faker.string.uuid();
      const account1 = faker.string.uuid();
      const category1 = faker.string.uuid();
      const account2 = faker.string.uuid();
      const category2 = faker.string.uuid();

      // Create 5+5 transactions

      const createInputs1: Transaction[] = [];
      for (let i = 0; i < 5; i++) {
        createInputs1.push(
          fakeTransaction({
            userId,
            accountId: account1,
            categoryId: category1,
            type: TransactionType.INCOME,
          }),
        );
      }
      await repository.createMany(createInputs1);

      const createInputs2: Transaction[] = [];
      for (let i = 0; i < 5; i++) {
        createInputs2.push(
          fakeTransaction({
            userId,
            accountId: account2,
            categoryId: category2,
            type: TransactionType.INCOME,
          }),
        );
      }
      await repository.createMany(createInputs2);

      // Act - Request with sampleSize of 5 (should only analyze last 5 transactions)
      const result = await repository.detectPatterns({
        userId,
        type: TransactionPatternType.INCOME,
        limit: 3,
        sampleSize: 5,
      });

      // Assert - Should return the pattern but only based on 5 transactions
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        accountId: account2,
        categoryId: category2,
        // Only 5 transactions analyzed due to sample size limit
      });
    });

    it("throws error for missing user ID", async () => {
      await expect(
        repository.detectPatterns({
          userId: "",
          type: TransactionPatternType.INCOME,
          limit: 3,
          sampleSize: 100,
        }),
      ).rejects.toThrow("User ID is required");
    });

    it("throws error for invalid limit parameter", async () => {
      const userId = faker.string.uuid();

      // Act & Assert - Zero limit
      await expect(
        repository.detectPatterns({
          userId,
          type: TransactionPatternType.INCOME,
          limit: 0,
          sampleSize: 100,
        }),
      ).rejects.toThrow("Limit must be a positive integer");

      // Act & Assert - Negative limit
      await expect(
        repository.detectPatterns({
          userId,
          type: TransactionPatternType.INCOME,
          limit: -1,
          sampleSize: 100,
        }),
      ).rejects.toThrow("Limit must be a positive integer");

      // Act & Assert - Non-integer limit
      await expect(
        repository.detectPatterns({
          userId,
          type: TransactionPatternType.INCOME,
          limit: 3.5,
          sampleSize: 100,
        }),
      ).rejects.toThrow("Limit must be a positive integer");
    });

    it("throws error for invalid sampleSize parameter", async () => {
      const userId = faker.string.uuid();

      // Act & Assert - Zero sample size
      await expect(
        repository.detectPatterns({
          userId,
          type: TransactionPatternType.INCOME,
          limit: 3,
          sampleSize: 0,
        }),
      ).rejects.toThrow("Sample size must be a positive integer");

      // Act & Assert - Negative sample size
      await expect(
        repository.detectPatterns({
          userId,
          type: TransactionPatternType.INCOME,
          limit: 3,
          sampleSize: -1,
        }),
      ).rejects.toThrow("Sample size must be a positive integer");

      // Act & Assert - Non-integer sample size
      await expect(
        repository.detectPatterns({
          userId,
          type: TransactionPatternType.INCOME,
          limit: 3,
          sampleSize: 50.5,
        }),
      ).rejects.toThrow("Sample size must be a positive integer");
    });

    it("returns only top N patterns based on limit parameter", async () => {
      const userId = faker.string.uuid();
      const transactions = [];
      const accountIds = Array.from({ length: 5 }, () => faker.string.uuid());
      const categoryIds = Array.from({ length: 5 }, () => faker.string.uuid());

      // Create 5 different patterns
      for (let i = 0; i < 5; i++) {
        transactions.push(
          fakeTransaction({
            userId,
            accountId: accountIds[i],
            categoryId: categoryIds[i],
            type: TransactionType.INCOME,
          }),
        );
      }

      await repository.createMany(transactions);

      // Act - Request only 2 patterns
      const result = await repository.detectPatterns({
        userId,
        type: TransactionPatternType.INCOME,
        limit: 2,
        sampleSize: 100,
      });

      // Assert - Should return only 2 patterns
      expect(result).toHaveLength(2);
    });

    it("isolates patterns by user", async () => {
      const user1 = faker.string.uuid();
      const user2 = faker.string.uuid();
      const account1 = faker.string.uuid();
      const category1 = faker.string.uuid();
      const account2 = faker.string.uuid();
      const category2 = faker.string.uuid();

      const user1Transactions: Transaction[] = [
        fakeTransaction({
          userId: user1,
          accountId: account1,
          categoryId: category1,
          type: TransactionType.INCOME,
        }),
      ];
      const user2Transactions: Transaction[] = [
        fakeTransaction({
          userId: user2,
          accountId: account2,
          categoryId: category2,
          type: TransactionType.INCOME,
        }),
      ];

      await repository.createMany([...user1Transactions, ...user2Transactions]);

      const user1Result = await repository.detectPatterns({
        userId: user1,
        type: TransactionPatternType.INCOME,
        limit: 3,
        sampleSize: 100,
      });
      const user2Result = await repository.detectPatterns({
        userId: user2,
        type: TransactionPatternType.INCOME,
        limit: 3,
        sampleSize: 100,
      });

      // Assert - Each user sees only their own patterns
      expect(user1Result).toHaveLength(1);
      expect(user1Result[0]).toEqual({
        accountId: account1,
        categoryId: category1,
      });

      expect(user2Result).toHaveLength(1);
      expect(user2Result[0]).toEqual({
        accountId: account2,
        categoryId: category2,
      });
    });
  });

  describe("hydration - data corruption detection", () => {
    it("throws error when required field amount is missing from database record", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const transaction = fakeTransaction({ userId });
      await repository.create(transaction);
      const client = createDynamoDBDocumentClient();

      // Manually corrupt the database record by removing amount
      await client.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { userId, id: transaction.id },
          UpdateExpression: "REMOVE amount",
        }),
      );

      // Act & Assert
      await expect(
        repository.findOneById({ id: transaction.id, userId }),
      ).rejects.toThrow();
    });
  });
});
