import { CategoryRepository } from "./CategoryRepository";
import { CreateCategoryInput, CategoryType } from "../models/Category";
import { createDynamoDBDocumentClient } from "./utils/dynamoClient";
import { truncateTable } from "../__tests__/utils/dynamodbHelpers";

describe("CategoryRepository", () => {
  let repository: CategoryRepository;
  const userId = "test-user-123";

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

  describe("findByUserId", () => {
    describe("with includeArchived=false (default)", () => {
      it("should return only active categories when includeArchived is false", async () => {
        // Arrange
        const category1: CreateCategoryInput = {
          userId,
          name: "Active Income",
          type: CategoryType.INCOME,
        };
        const category2: CreateCategoryInput = {
          userId,
          name: "Archived Expense",
          type: CategoryType.EXPENSE,
        };

        // Create categories
        await repository.create(category1);
        const created2 = await repository.create(category2);

        // Archive one category
        await repository.archive(created2.id, userId);

        // Act
        const result = await repository.findByUserId(userId, { includeArchived: false });

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Active Income");
        expect(result[0].isArchived).toBe(false);
      });

      it("should return only active categories when includeArchived is not specified", async () => {
        // Arrange
        const category1: CreateCategoryInput = {
          userId,
          name: "Active Category",
          type: CategoryType.INCOME,
        };
        const category2: CreateCategoryInput = {
          userId,
          name: "Archived Category",
          type: CategoryType.EXPENSE,
        };

        // Create and archive
        await repository.create(category1);
        const created2 = await repository.create(category2);
        await repository.archive(created2.id, userId);

        // Act
        const result = await repository.findByUserId(userId);

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].isArchived).toBe(false);
      });
    });

    describe("with includeArchived=true", () => {
      it("should return both active and archived categories when includeArchived is true", async () => {
        // Arrange
        const category1: CreateCategoryInput = {
          userId,
          name: "Active Category",
          type: CategoryType.INCOME,
        };
        const category2: CreateCategoryInput = {
          userId,
          name: "Archived Category",
          type: CategoryType.EXPENSE,
        };

        // Create categories
        await repository.create(category1);
        const created2 = await repository.create(category2);

        // Archive one category
        await repository.archive(created2.id, userId);

        // Act
        const result = await repository.findByUserId(userId, { includeArchived: true });

        // Assert
        expect(result).toHaveLength(2);
        const archived = result.find((c) => c.isArchived);
        const active = result.find((c) => !c.isArchived);
        expect(archived?.name).toBe("Archived Category");
        expect(active?.name).toBe("Active Category");
      });

      it("should include archived categories with isArchived=true", async () => {
        // Arrange
        const category: CreateCategoryInput = {
          userId,
          name: "Test Category",
          type: CategoryType.INCOME,
        };

        // Create and archive
        const created = await repository.create(category);
        await repository.archive(created.id, userId);

        // Act
        const result = await repository.findByUserId(userId, { includeArchived: true });

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].isArchived).toBe(true);
        expect(result[0].name).toBe("Test Category");
      });
    });

    describe("sorting", () => {
      it("should return categories sorted by type first, then by name", async () => {
        // Arrange
        const categories: CreateCategoryInput[] = [
          { userId, name: "Zebra Expense", type: CategoryType.EXPENSE },
          { userId, name: "Apple Income", type: CategoryType.INCOME },
          { userId, name: "Banana Expense", type: CategoryType.EXPENSE },
        ];

        for (const category of categories) {
          await repository.create(category);
        }

        // Act
        const result = await repository.findByUserId(userId, { includeArchived: false });

        // Assert
        expect(result).toHaveLength(3);
        // INCOME comes first, then EXPENSE
        expect(result[0].type).toBe(CategoryType.INCOME);
        expect(result[0].name).toBe("Apple Income");
        expect(result[1].type).toBe(CategoryType.EXPENSE);
        expect(result[1].name).toBe("Banana Expense");
        expect(result[2].type).toBe(CategoryType.EXPENSE);
        expect(result[2].name).toBe("Zebra Expense");
      });
    });

    it("should return empty array when no categories exist for user", async () => {
      // Act
      const result = await repository.findByUserId("non-existent-user");

      // Assert
      expect(result).toEqual([]);
    });

    it("should throw error when userId is not provided", async () => {
      // Act & Assert
      await expect(repository.findByUserId("")).rejects.toThrow("User ID is required");
    });
  });

  describe("findByUserIdAndType", () => {
    describe("with includeArchived=false (default)", () => {
      it("should return only active categories of specified type", async () => {
        // Arrange
        const income1: CreateCategoryInput = {
          userId,
          name: "Active Income",
          type: CategoryType.INCOME,
        };
        const expense1: CreateCategoryInput = {
          userId,
          name: "Active Expense",
          type: CategoryType.EXPENSE,
        };
        const income2: CreateCategoryInput = {
          userId,
          name: "Archived Income",
          type: CategoryType.INCOME,
        };

        // Create categories
        await repository.create(income1);
        await repository.create(expense1);
        const created3 = await repository.create(income2);

        // Archive one income category
        await repository.archive(created3.id, userId);

        // Act
        const result = await repository.findByUserIdAndType(userId, CategoryType.INCOME, {
          includeArchived: false,
        });

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Active Income");
        expect(result[0].type).toBe(CategoryType.INCOME);
        expect(result[0].isArchived).toBe(false);
      });
    });

    describe("with includeArchived=true", () => {
      it("should return both active and archived categories of specified type", async () => {
        // Arrange
        const income1: CreateCategoryInput = {
          userId,
          name: "Active Income",
          type: CategoryType.INCOME,
        };
        const income2: CreateCategoryInput = {
          userId,
          name: "Archived Income",
          type: CategoryType.INCOME,
        };
        const expense1: CreateCategoryInput = {
          userId,
          name: "Active Expense",
          type: CategoryType.EXPENSE,
        };

        // Create categories
        await repository.create(income1);
        await repository.create(expense1);
        const created2 = await repository.create(income2);

        // Archive one income category
        await repository.archive(created2.id, userId);

        // Act
        const result = await repository.findByUserIdAndType(userId, CategoryType.INCOME, {
          includeArchived: true,
        });

        // Assert
        expect(result).toHaveLength(2);
        expect(result.every((c) => c.type === CategoryType.INCOME)).toBe(true);
        const archived = result.find((c) => c.isArchived);
        expect(archived?.name).toBe("Archived Income");
      });
    });
  });
});
