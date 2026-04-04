import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { faker } from "@faker-js/faker";
import { beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { CategoryType } from "../models/category";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import { requireEnv } from "../utils/require-env";
import { truncateTable } from "../utils/test-utils/dynamodb-helpers";
import { fakeCreateCategoryInput } from "../utils/test-utils/factories";
import { DynCategoryRepository } from "./dyn-category-repository";

describe("DynCategoryRepository", () => {
  let repository: DynCategoryRepository;
  const userId = faker.string.uuid();
  const tableName = requireEnv("CATEGORIES_TABLE_NAME");

  beforeAll(async () => {
    // Create repository instance
    repository = new DynCategoryRepository(tableName);
  });

  beforeEach(async () => {
    // Clean up categories table before each test
    const client = createDynamoDBDocumentClient();
    await truncateTable(client, tableName, {
      partitionKey: "userId",
      sortKey: "id",
    });
  });

  describe("findManyByUserId", () => {
    it("should return categories sorted alphabetically", async () => {
      // Arrange - Create categories in mixed order with different types
      await repository.create(
        fakeCreateCategoryInput({
          userId,
          name: "Zebra",
          type: CategoryType.EXPENSE,
        }),
      );
      await repository.create(
        fakeCreateCategoryInput({
          userId,
          name: "Apple",
          type: CategoryType.INCOME,
        }),
      );
      await repository.create(
        fakeCreateCategoryInput({
          userId,
          name: "Banana",
          type: CategoryType.EXPENSE,
        }),
      );
      await repository.create(
        fakeCreateCategoryInput({
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

    it("should handle case-insensitive sorting", async () => {
      // Arrange - Create categories with mixed case
      await repository.create(
        fakeCreateCategoryInput({
          userId,
          name: "travel",
          type: CategoryType.EXPENSE,
        }),
      );
      await repository.create(
        fakeCreateCategoryInput({
          userId,
          name: "apple",
          type: CategoryType.EXPENSE,
        }),
      );
      await repository.create(
        fakeCreateCategoryInput({
          userId,
          name: "Trip",
          type: CategoryType.EXPENSE,
        }),
      );
      await repository.create(
        fakeCreateCategoryInput({
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

    it("should sort numeric prefixes before letters", async () => {
      // Arrange
      await repository.create(
        fakeCreateCategoryInput({
          userId,
          name: "Travel",
          type: CategoryType.EXPENSE,
        }),
      );
      await repository.create(
        fakeCreateCategoryInput({
          userId,
          name: "401k Contribution",
          type: CategoryType.EXPENSE,
        }),
      );
      await repository.create(
        fakeCreateCategoryInput({
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

    it("should not return archived categories", async () => {
      // Arrange
      const active = await repository.create(
        fakeCreateCategoryInput({ userId, name: "Active" }),
      );
      const archived = await repository.create(
        fakeCreateCategoryInput({ userId, name: "Archived" }),
      );
      await repository.archive({ id: archived.id, userId });

      // Act
      const result = await repository.findManyByUserId(userId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(active.id);
    });

    it("should return only categories of specified type when type filter is given", async () => {
      // Arrange
      await repository.create(
        fakeCreateCategoryInput({
          userId,
          name: "Groceries",
          type: CategoryType.EXPENSE,
        }),
      );
      await repository.create(
        fakeCreateCategoryInput({
          userId,
          name: "Salary",
          type: CategoryType.INCOME,
        }),
      );
      await repository.create(
        fakeCreateCategoryInput({
          userId,
          name: "Utilities",
          type: CategoryType.EXPENSE,
        }),
      );
      await repository.create(
        fakeCreateCategoryInput({
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
    it("should return all categories including archived", async () => {
      // Arrange
      const activeCategory = await repository.create(
        fakeCreateCategoryInput({ userId, type: CategoryType.EXPENSE }),
      );
      let archivedCategory = await repository.create(
        fakeCreateCategoryInput({ userId, type: CategoryType.INCOME }),
      );
      archivedCategory = await repository.archive({
        id: archivedCategory.id,
        userId,
      });

      // Act
      const result = await repository.findManyWithArchivedByUserId(userId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(activeCategory);
      expect(result).toContainEqual(archivedCategory);
      expect(activeCategory.isArchived).toBe(false);
      expect(archivedCategory.isArchived).toBe(true);
    });

    it("should return categories of all types", async () => {
      // Arrange
      const expenseCategory = await repository.create(
        fakeCreateCategoryInput({ userId, type: CategoryType.EXPENSE }),
      );
      const incomeCategory = await repository.create(
        fakeCreateCategoryInput({ userId, type: CategoryType.INCOME }),
      );

      // Act
      const result = await repository.findManyWithArchivedByUserId(userId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(expenseCategory);
      expect(result).toContainEqual(incomeCategory);
    });

    it("should not return categories from other users", async () => {
      // Arrange
      const otherUserId = faker.string.uuid();
      await repository.create(fakeCreateCategoryInput({ userId }));
      await repository.create(fakeCreateCategoryInput({ userId: otherUserId }));

      // Act
      const result = await repository.findManyWithArchivedByUserId(userId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.userId).toBe(userId);
    });

    it("should throw error when userId is missing", async () => {
      // Act & Assert
      await expect(repository.findManyWithArchivedByUserId("")).rejects.toThrow(
        "User ID is required",
      );
    });
  });

  describe("findManyByIds", () => {
    it("should return categories when IDs exist", async () => {
      // Arrange
      const category1 = await repository.create(
        fakeCreateCategoryInput({ userId }),
      );
      const category2 = await repository.create(
        fakeCreateCategoryInput({ userId }),
      );

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

    it("should return empty array when IDs are empty", async () => {
      // Act
      const result = await repository.findManyWithArchivedByIds({
        ids: [],
        userId,
      });

      // Assert
      expect(result).toEqual([]);
    });

    it("should return only found categories when some IDs are missing", async () => {
      // Arrange
      const category = await repository.create(
        fakeCreateCategoryInput({ userId }),
      );

      // Act
      const result = await repository.findManyWithArchivedByIds({
        ids: [category.id, "nonexistent-id"],
        userId,
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(category);
    });

    it("should throw error when userId is missing", async () => {
      // Act & Assert
      await expect(
        repository.findManyWithArchivedByIds({
          ids: ["category-1"],
          userId: "",
        }),
      ).rejects.toThrow("User ID is required");
    });

    it("should return archived categories (not filtered)", async () => {
      // Arrange
      const category = await repository.create(
        fakeCreateCategoryInput({ userId }),
      );
      await repository.archive({ id: category.id, userId });

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
    it("should create a category successfully", async () => {
      // Arrange
      const input = fakeCreateCategoryInput({ userId });

      // Act
      const result = await repository.create(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.name).toBe(input.name);
      expect(result.type).toBe(input.type);
      expect(result.excludeFromReports).toBe(input.excludeFromReports);
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
    });

    it("should refetch created category from database to verify stored data", async () => {
      // Arrange
      const input = fakeCreateCategoryInput({ userId });

      // Act
      const created = await repository.create(input);
      const stored = await repository.findOneById({ id: created.id, userId });

      // Assert
      expect(stored).toBeDefined();
      expect(stored).toEqual(created);
    });
  });

  describe("update", () => {
    it("should update category name successfully", async () => {
      // Arrange
      const category = await repository.create(
        fakeCreateCategoryInput({
          userId,
        }),
      );
      const newName = "New Name";

      // Act
      const result = await repository.update(
        { id: category.id, userId },
        {
          name: newName,
        },
      );

      // Assert
      expect(result.name).toBe(newName);
      expect(result.updatedAt).not.toBe(category.updatedAt);
    });

    it("should update category type successfully", async () => {
      // Arrange
      const category = await repository.create(
        fakeCreateCategoryInput({
          userId,
          type: CategoryType.EXPENSE,
        }),
      );

      // Act
      const result = await repository.update(
        { id: category.id, userId },
        {
          type: CategoryType.INCOME,
        },
      );

      // Assert
      expect(result.type).toBe(CategoryType.INCOME);
      expect(result.updatedAt).not.toBe(category.updatedAt);
    });

    it("should update excludeFromReports flag successfully", async () => {
      // Arrange
      const category = await repository.create(
        fakeCreateCategoryInput({ userId, excludeFromReports: false }),
      );

      // Act
      const result = await repository.update(
        { id: category.id, userId },
        {
          excludeFromReports: true,
        },
      );

      // Assert
      expect(result.excludeFromReports).toBe(true);
      expect(result.updatedAt).not.toBe(category.updatedAt);
    });

    it("should update all fields successfully", async () => {
      // Arrange
      const category = await repository.create(
        fakeCreateCategoryInput({
          userId,
          name: "Old Name",
          type: CategoryType.EXPENSE,
          excludeFromReports: false,
        }),
      );

      const newName = "New Name";
      const newType = CategoryType.INCOME;
      const newExcludeFromReports = true;

      // Act
      const result = await repository.update(
        { id: category.id, userId },
        {
          name: newName,
          type: newType,
          excludeFromReports: newExcludeFromReports,
        },
      );

      // Assert
      expect(result.name).toBe(newName);
      expect(result.type).toBe(newType);
      expect(result.excludeFromReports).toBe(newExcludeFromReports);
      expect(result.updatedAt).not.toBe(category.updatedAt);
    });

    it("should throw error when category does not exist", async () => {
      // Act & Assert
      await expect(
        repository.update(
          { id: "nonexistent-id", userId },
          { name: "New Name" },
        ),
      ).rejects.toThrow("Category not found");
    });

    it("should throw error when updating archived category", async () => {
      // Arrange
      const category = await repository.create(
        fakeCreateCategoryInput({ userId }),
      );
      await repository.archive({ id: category.id, userId });

      // Act & Assert
      await expect(
        repository.update({ id: category.id, userId }, { name: "New Name" }),
      ).rejects.toThrow("Category not found");
    });

    it("should throw error when required parameters are missing", async () => {
      // Act & Assert
      await expect(
        repository.update({ id: "", userId: "user-id" }, { name: "Test" }),
      ).rejects.toThrow("Category ID is required");

      await expect(
        repository.update({ id: "some-id", userId: "" }, { name: "Test" }),
      ).rejects.toThrow("User ID is required");
    });
  });

  describe("archive", () => {
    it("should archive a category successfully", async () => {
      // Arrange
      const category = await repository.create(
        fakeCreateCategoryInput({ userId }),
      );

      // Act
      const result = await repository.archive({ id: category.id, userId });

      // Assert
      expect(result.id).toBe(category.id);
      expect(result.isArchived).toBe(true);
      expect(result.updatedAt).not.toBe(category.updatedAt);
    });

    it("should throw error when archiving non-existent category", async () => {
      // Act & Assert
      await expect(
        repository.archive({ id: "nonexistent-id", userId }),
      ).rejects.toThrow("Category not found or already archived");
    });

    it("should throw error when archiving already archived category", async () => {
      // Arrange
      const category = await repository.create(
        fakeCreateCategoryInput({ userId }),
      );
      await repository.archive({ id: category.id, userId });

      // Act & Assert
      await expect(
        repository.archive({ id: category.id, userId }),
      ).rejects.toThrow("Category not found or already archived");
    });

    it("should throw error when required parameters are missing", async () => {
      // Act & Assert
      await expect(
        repository.archive({ id: "", userId: "user-id" }),
      ).rejects.toThrow("Category ID is required");

      await expect(
        repository.archive({ id: "some-id", userId: "" }),
      ).rejects.toThrow("User ID is required");
    });
  });

  describe("hydration - data corruption detection", () => {
    it("should throw error when required field type is missing from database record", async () => {
      // Arrange
      const category = await repository.create(
        fakeCreateCategoryInput({ userId }),
      );
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
