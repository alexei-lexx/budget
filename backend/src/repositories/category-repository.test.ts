import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { faker } from "@faker-js/faker";
import { truncateTable } from "../__tests__/utils/dynamodb-helpers";
import { fakeCreateCategoryInput } from "../__tests__/utils/factories";
import { CategoryType } from "../models/category";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import { CategoryRepository } from "./category-repository";

describe("CategoryRepository", () => {
  let repository: CategoryRepository;
  const userId = faker.string.uuid();

  beforeAll(async () => {
    // Create repository instance
    repository = new CategoryRepository();
  });

  beforeEach(async () => {
    // Clean up categories table before each test
    const client = createDynamoDBDocumentClient();
    const tableName = process.env.CATEGORIES_TABLE_NAME || "";
    await truncateTable(client, tableName, {
      partitionKey: "userId",
      sortKey: "id",
    });
  });

  describe("findByIds", () => {
    it("should return categories when IDs exist", async () => {
      // Arrange
      const category1 = await repository.create(
        fakeCreateCategoryInput({ userId }),
      );
      const category2 = await repository.create(
        fakeCreateCategoryInput({ userId }),
      );

      // Act
      const result = await repository.findByIds(
        [category1.id, category2.id],
        userId,
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(category1);
      expect(result).toContainEqual(category2);
    });

    it("should return empty array when IDs are empty", async () => {
      // Act
      const result = await repository.findByIds([], userId);

      // Assert
      expect(result).toEqual([]);
    });

    it("should return only found categories when some IDs are missing", async () => {
      // Arrange
      const category = await repository.create(
        fakeCreateCategoryInput({ userId }),
      );

      // Act
      const result = await repository.findByIds(
        [category.id, "nonexistent-id"],
        userId,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(category);
    });

    it("should throw error when userId is missing", async () => {
      // Act & Assert
      await expect(repository.findByIds(["category-1"], "")).rejects.toThrow(
        "User ID is required",
      );
    });

    it("should return archived categories (not filtered)", async () => {
      // Arrange
      const category = await repository.create(
        fakeCreateCategoryInput({ userId }),
      );
      await repository.archive(category.id, userId);

      // Act
      const result = await repository.findByIds([category.id], userId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.isArchived).toBe(true);
    });
  });

  describe("findActiveByUserId", () => {
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
      const result = await repository.findActiveByUserId(userId);

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
      const result = await repository.findActiveByUserId(userId);

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
      const result = await repository.findActiveByUserId(userId);

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
      await repository.archive(archived.id, userId);

      // Act
      const result = await repository.findActiveByUserId(userId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(active.id);
    });
  });

  describe("findActiveByUserIdAndType", () => {
    it("should return only categories of specified type, sorted alphabetically", async () => {
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
      const result = await repository.findActiveByUserIdAndType(
        userId,
        CategoryType.EXPENSE,
      );

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
      const result = await repository.findActiveByUserId(userId);

      // Assert - Case-insensitive grouping
      expect(result.map((category) => category.name)).toEqual([
        "apple",
        "travel",
        "Trip",
        "ZEBRA",
      ]);
    });

    it("should not return archived categories", async () => {
      // Arrange
      const active = await repository.create(
        fakeCreateCategoryInput({
          userId,
          name: "Active Income",
          type: CategoryType.INCOME,
        }),
      );
      const archived = await repository.create(
        fakeCreateCategoryInput({
          userId,
          name: "Archived Income",
          type: CategoryType.INCOME,
        }),
      );
      await repository.archive(archived.id, userId);

      // Act
      const result = await repository.findActiveByUserIdAndType(
        userId,
        CategoryType.INCOME,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(active.id);
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
      const tableName = process.env.CATEGORIES_TABLE_NAME || "";
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
        repository.findByIds([category.id], userId),
      ).rejects.toThrow();
    });
  });
});
