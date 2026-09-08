import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { faker } from "@faker-js/faker";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CategoryType } from "../models/category";
import { RepositoryError } from "../ports/repository-error";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import { requireEnv } from "../utils/require-env";
import { truncateTable } from "../utils/test-utils/dynamodb-helpers";
import { fakeCategory } from "../utils/test-utils/models/category-fakes";
import { DynCategoryRepository } from "./dyn-category-repository";

describe("DynCategoryRepository", () => {
  let repository: DynCategoryRepository;
  const userId = faker.string.uuid();
  const tableName = requireEnv("CATEGORIES_TABLE_NAME");
  const client = createDynamoDBDocumentClient();

  beforeAll(async () => {
    // Create repository instance
    repository = new DynCategoryRepository(tableName, client);
  });

  beforeEach(async () => {
    // Clean up categories table before each test
    await truncateTable(client, tableName, {
      partitionKey: "userId",
      sortKey: "id",
    });
  });

  describe("findManyByUserId", () => {
    it("returns categories sorted alphabetically", async () => {
      // Arrange - Create categories in mixed order with different types
      await repository.create(
        fakeCategory({
          userId,
          name: "Zebra",
          type: CategoryType.EXPENSE,
        }),
      );
      await repository.create(
        fakeCategory({
          userId,
          name: "Apple",
          type: CategoryType.INCOME,
        }),
      );
      await repository.create(
        fakeCategory({
          userId,
          name: "Banana",
          type: CategoryType.EXPENSE,
        }),
      );
      await repository.create(
        fakeCategory({
          userId,
          name: "Salary",
          type: CategoryType.INCOME,
        }),
      );

      // Act
      const result = await repository.findManyByUserId(userId);

      // Assert - Should be alphabetically sorted
      expect(result.map((category) => category.name)).toEqual([
        "Apple",
        "Banana",
        "Salary",
        "Zebra",
      ]);
    });

    it("handles case-insensitive sorting", async () => {
      // Arrange - Create categories with mixed case
      await repository.create(
        fakeCategory({
          userId,
          name: "travel",
          type: CategoryType.EXPENSE,
        }),
      );
      await repository.create(
        fakeCategory({
          userId,
          name: "apple",
          type: CategoryType.EXPENSE,
        }),
      );
      await repository.create(
        fakeCategory({
          userId,
          name: "Trip",
          type: CategoryType.EXPENSE,
        }),
      );
      await repository.create(
        fakeCategory({
          userId,
          name: "ZEBRA",
          type: CategoryType.EXPENSE,
        }),
      );

      // Act
      const result = await repository.findManyByUserId(userId);

      // Assert - Case-insensitive grouping
      expect(result.map((category) => category.name)).toEqual([
        "apple",
        "travel",
        "Trip",
        "ZEBRA",
      ]);
    });

    it("sorts numeric prefixes before letters", async () => {
      // Arrange
      await repository.create(
        fakeCategory({
          userId,
          name: "Travel",
          type: CategoryType.EXPENSE,
        }),
      );
      await repository.create(
        fakeCategory({
          userId,
          name: "401k Contribution",
          type: CategoryType.EXPENSE,
        }),
      );
      await repository.create(
        fakeCategory({
          userId,
          name: "Savings",
          type: CategoryType.EXPENSE,
        }),
      );

      // Act
      const result = await repository.findManyByUserId(userId);

      // Assert - Numbers before letters
      expect(result.map((category) => category.name)).toEqual([
        "401k Contribution",
        "Savings",
        "Travel",
      ]);
    });

    it("does not return archived categories", async () => {
      // Arrange
      const active = fakeCategory({ userId, name: "Active" });
      await repository.create(active);
      const archived = fakeCategory({ userId, name: "Archived" });
      await repository.create(archived);
      await repository.update(archived.archive());

      // Act
      const result = await repository.findManyByUserId(userId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(active.id);
    });

    it("returns only categories of specified type when type filter is given", async () => {
      // Arrange
      await repository.create(
        fakeCategory({
          userId,
          name: "Groceries",
          type: CategoryType.EXPENSE,
        }),
      );
      await repository.create(
        fakeCategory({
          userId,
          name: "Salary",
          type: CategoryType.INCOME,
        }),
      );
      await repository.create(
        fakeCategory({
          userId,
          name: "Utilities",
          type: CategoryType.EXPENSE,
        }),
      );
      await repository.create(
        fakeCategory({
          userId,
          name: "Bonus",
          type: CategoryType.INCOME,
        }),
      );

      // Act
      const result = await repository.findManyByUserId(userId, {
        type: CategoryType.EXPENSE,
      });

      // Assert
      expect(result).toHaveLength(2);
      expect(result.map((category) => category.name)).toEqual([
        "Groceries",
        "Utilities",
      ]);
      expect(
        result.every((category) => category.type === CategoryType.EXPENSE),
      ).toBe(true);
    });
  });

  describe("findManyByUserId", () => {
    it("returns all categories including archived", async () => {
      // Arrange
      const activeCategory = fakeCategory({
        userId,
        type: CategoryType.EXPENSE,
      });
      await repository.create(activeCategory);

      const categoryToArchive = fakeCategory({
        userId,
        type: CategoryType.INCOME,
      });
      await repository.create(categoryToArchive);
      const archivedCategory = await repository.update(
        categoryToArchive.archive(),
      );

      // Act
      const result = await repository.findManyWithArchivedByUserId(userId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(activeCategory);
      expect(result).toContainEqual(archivedCategory);
      expect(activeCategory.isArchived).toBe(false);
      expect(archivedCategory.isArchived).toBe(true);
    });

    it("returns categories of all types", async () => {
      // Arrange
      const expenseCategory = fakeCategory({
        userId,
        type: CategoryType.EXPENSE,
      });
      await repository.create(expenseCategory);
      const incomeCategory = fakeCategory({
        userId,
        type: CategoryType.INCOME,
      });
      await repository.create(incomeCategory);

      // Act
      const result = await repository.findManyWithArchivedByUserId(userId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(expenseCategory);
      expect(result).toContainEqual(incomeCategory);
    });

    it("does not return categories from other users", async () => {
      // Arrange
      const otherUserId = faker.string.uuid();
      await repository.create(fakeCategory({ userId }));
      await repository.create(fakeCategory({ userId: otherUserId }));

      // Act
      const result = await repository.findManyWithArchivedByUserId(userId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.userId).toBe(userId);
    });

    it("throws error when userId is missing", async () => {
      // Act & Assert
      await expect(repository.findManyWithArchivedByUserId("")).rejects.toThrow(
        "User ID is required",
      );
    });
  });

  describe("findManyByIds", () => {
    it("returns categories when IDs exist", async () => {
      // Arrange
      const category1 = fakeCategory({ userId });
      await repository.create(category1);
      const category2 = fakeCategory({ userId });
      await repository.create(category2);

      // Act
      const result = await repository.findManyWithArchivedByIds({
        ids: [category1.id, category2.id],
        userId,
      });

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(category1);
      expect(result).toContainEqual(category2);
    });

    it("returns empty array when IDs are empty", async () => {
      // Act
      const result = await repository.findManyWithArchivedByIds({
        ids: [],
        userId,
      });

      // Assert
      expect(result).toEqual([]);
    });

    it("returns only found categories when some IDs are missing", async () => {
      // Arrange
      const category = fakeCategory({ userId });
      await repository.create(category);

      // Act
      const result = await repository.findManyWithArchivedByIds({
        ids: [category.id, "nonexistent-id"],
        userId,
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(category);
    });

    it("throws error when userId is missing", async () => {
      // Act & Assert
      await expect(
        repository.findManyWithArchivedByIds({
          ids: ["category-1"],
          userId: "",
        }),
      ).rejects.toThrow("User ID is required");
    });

    it("returns archived categories (not filtered)", async () => {
      // Arrange
      const category = fakeCategory({ userId });
      await repository.create(category);
      await repository.update(category.archive());

      // Act
      const result = await repository.findManyWithArchivedByIds({
        ids: [category.id],
        userId,
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.isArchived).toBe(true);
    });
  });

  describe("create", () => {
    it("persists category", async () => {
      // Arrange
      const category = fakeCategory({ userId });

      // Act
      const result = await repository.create(category);

      // Assert
      expect(result).toBeUndefined();

      const stored = await repository.findOneById({ id: category.id, userId });
      expect(stored?.toData()).toEqual(category.toData());
    });

    it("rejects duplicate id", async () => {
      // Arrange
      const category = fakeCategory({ userId });
      await repository.create(category);

      // Act & Assert
      await expect(repository.create(category)).rejects.toThrow(
        RepositoryError,
      );
    });
  });

  describe("update", () => {
    it("updates category name successfully", async () => {
      // Arrange
      const category = fakeCategory({ userId });
      await repository.create(category);

      // Act
      const result = await repository.update(
        category.update({ name: "New Name" }),
      );

      // Assert
      expect(result.name).toBe("New Name");
      expect(result.updatedAt).not.toBe(category.updatedAt);
    });

    it("updates category type successfully", async () => {
      // Arrange
      const category = fakeCategory({ userId, type: CategoryType.EXPENSE });
      await repository.create(category);

      // Act
      const result = await repository.update(
        category.update({ type: CategoryType.INCOME }),
      );

      // Assert
      expect(result.type).toBe(CategoryType.INCOME);
      expect(result.updatedAt).not.toBe(category.updatedAt);
    });

    it("updates excludeFromReports flag successfully", async () => {
      // Arrange
      const category = fakeCategory({ userId, excludeFromReports: false });
      await repository.create(category);

      // Act
      const result = await repository.update(
        category.update({ excludeFromReports: true }),
      );

      // Assert
      expect(result.excludeFromReports).toBe(true);
      expect(result.updatedAt).not.toBe(category.updatedAt);
    });

    it("updates all fields successfully", async () => {
      // Arrange
      const category = fakeCategory({
        userId,
        name: "Old Name",
        type: CategoryType.EXPENSE,
        excludeFromReports: false,
      });
      await repository.create(category);

      // Act
      const result = await repository.update(
        category.update({
          name: "New Name",
          type: CategoryType.INCOME,
          excludeFromReports: true,
        }),
      );

      // Assert
      expect(result.name).toBe("New Name");
      expect(result.type).toBe(CategoryType.INCOME);
      expect(result.excludeFromReports).toBe(true);
      expect(result.updatedAt).not.toBe(category.updatedAt);
    });

    it("archives category", async () => {
      // Arrange
      const category = fakeCategory({ userId });
      await repository.create(category);

      // Act
      const result = await repository.update(category.archive());

      // Assert
      expect(result.id).toBe(category.id);
      expect(result.isArchived).toBe(true);
      expect(result.updatedAt).not.toBe(category.updatedAt);
    });

    it("throws error when category does not exist", async () => {
      // Arrange - entity built but never persisted
      const ghost = fakeCategory({ userId });

      // Act & Assert
      await expect(
        repository.update(ghost.update({ name: "New Name" })),
      ).rejects.toThrow("Category not found or already archived");
    });

    it("throws error when updating an already archived category", async () => {
      // Arrange - simulate a stale client that read the category before it
      // was archived by someone else.
      const category = fakeCategory({ userId });
      await repository.create(category);
      await repository.update(category.archive());

      // Act & Assert
      await expect(
        repository.update(category.update({ name: "New Name" })),
      ).rejects.toThrow("Category not found or already archived");
    });

    it("throws error when archiving an already archived category", async () => {
      // Arrange - simulate a stale client racing another archive
      const category = fakeCategory({ userId });
      await repository.create(category);
      await repository.update(category.archive());

      // Act & Assert
      await expect(repository.update(category.archive())).rejects.toThrow(
        "Category not found or already archived",
      );
    });
  });

  describe("hydration - data corruption detection", () => {
    it("throws error when required field type is missing from database record", async () => {
      // Arrange
      const category = fakeCategory({ userId });
      await repository.create(category);
      const client = createDynamoDBDocumentClient();

      // Manually corrupt the database record by removing type (type is a reserved keyword)
      await client.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { userId, id: category.id },
          UpdateExpression: "REMOVE #t",
          ExpressionAttributeNames: {
            "#t": "type",
          },
        }),
      );

      // Act & Assert
      await expect(
        repository.findManyWithArchivedByIds({ ids: [category.id], userId }),
      ).rejects.toThrow();
    });
  });
});
