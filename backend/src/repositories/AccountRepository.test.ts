import { AccountRepository } from "./AccountRepository";
import { CreateAccountInput } from "../models/Account";
import { createDynamoDBDocumentClient } from "./utils/dynamoClient";
import { truncateTable } from "../__tests__/utils/dynamodbHelpers";

describe("AccountRepository", () => {
  let repository: AccountRepository;
  const userId = "test-user-123";

  beforeAll(async () => {
    // Create repository instance
    repository = new AccountRepository();
  });

  beforeEach(async () => {
    // Clean up accounts table before each test
    const client = createDynamoDBDocumentClient();
    const tableName = process.env.ACCOUNTS_TABLE_NAME || "";
    await truncateTable(client, tableName, {
      partitionKey: "userId",
      sortKey: "id",
    });
  });

  describe("findByUserId", () => {
    describe("with includeArchived=false (default)", () => {
      it("should return only active accounts when includeArchived is false", async () => {
        // Arrange
        const account1: CreateAccountInput = {
          userId,
          name: "Active Account",
          currency: "USD",
          initialBalance: 1000,
        };
        const account2: CreateAccountInput = {
          userId,
          name: "Another Active Account",
          currency: "EUR",
          initialBalance: 2000,
        };

        // Create accounts
        await repository.create(account1);
        const createdAccount2 = await repository.create(account2);

        // Archive one account
        await repository.archive(createdAccount2.id, userId);

        // Act
        const result = await repository.findByUserId(userId, { includeArchived: false });

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Active Account");
        expect(result[0].isArchived).toBe(false);
      });

      it("should return only active accounts when includeArchived is not specified", async () => {
        // Arrange
        const account1: CreateAccountInput = {
          userId,
          name: "Active Account",
          currency: "USD",
          initialBalance: 1000,
        };
        const account2: CreateAccountInput = {
          userId,
          name: "Archived Account",
          currency: "EUR",
          initialBalance: 2000,
        };

        // Create and archive
        await repository.create(account1);
        const createdAccount2 = await repository.create(account2);
        await repository.archive(createdAccount2.id, userId);

        // Act
        const result = await repository.findByUserId(userId);

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].isArchived).toBe(false);
      });
    });

    describe("with includeArchived=true", () => {
      it("should return both active and archived accounts when includeArchived is true", async () => {
        // Arrange
        const account1: CreateAccountInput = {
          userId,
          name: "Active Account",
          currency: "USD",
          initialBalance: 1000,
        };
        const account2: CreateAccountInput = {
          userId,
          name: "Archived Account",
          currency: "EUR",
          initialBalance: 2000,
        };

        // Create accounts
        await repository.create(account1);
        const createdAccount2 = await repository.create(account2);

        // Archive one account
        await repository.archive(createdAccount2.id, userId);

        // Act
        const result = await repository.findByUserId(userId, { includeArchived: true });

        // Assert
        expect(result).toHaveLength(2);
        const archivedAccount = result.find((a) => a.isArchived);
        const activeAccount = result.find((a) => !a.isArchived);
        expect(archivedAccount?.name).toBe("Archived Account");
        expect(activeAccount?.name).toBe("Active Account");
      });

      it("should include archived accounts with isArchived=true", async () => {
        // Arrange
        const account: CreateAccountInput = {
          userId,
          name: "Test Account",
          currency: "USD",
          initialBalance: 1000,
        };

        // Create and archive
        const created = await repository.create(account);
        await repository.archive(created.id, userId);

        // Act
        const result = await repository.findByUserId(userId, { includeArchived: true });

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].isArchived).toBe(true);
        expect(result[0].name).toBe("Test Account");
      });
    });

    describe("sorting", () => {
      it("should return accounts sorted by name (case-insensitive)", async () => {
        // Arrange
        const accounts: CreateAccountInput[] = [
          { userId, name: "Zebra Account", currency: "USD", initialBalance: 1000 },
          { userId, name: "Apple Account", currency: "USD", initialBalance: 2000 },
          { userId, name: "banana Account", currency: "USD", initialBalance: 3000 },
        ];

        for (const account of accounts) {
          await repository.create(account);
        }

        // Act
        const result = await repository.findByUserId(userId, { includeArchived: false });

        // Assert
        expect(result).toHaveLength(3);
        expect(result[0].name).toBe("Apple Account");
        expect(result[1].name).toBe("banana Account");
        expect(result[2].name).toBe("Zebra Account");
      });
    });

    it("should return empty array when no accounts exist for user", async () => {
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
});
