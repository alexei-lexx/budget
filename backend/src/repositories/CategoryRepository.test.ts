import { faker } from "@faker-js/faker";
import { CategoryRepository } from "./CategoryRepository";
import { createDynamoDBDocumentClient } from "./utils/dynamoClient";
import { truncateTable } from "../__tests__/utils/dynamodbHelpers";
import { fakeCreateCategoryInput } from "../__tests__/utils/factories";

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
});
