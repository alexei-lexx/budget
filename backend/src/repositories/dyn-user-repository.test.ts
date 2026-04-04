import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { faker } from "@faker-js/faker";
import { beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import { truncateTable } from "../utils/test-utils/dynamodb-helpers";
import { fakeCreateUserInput } from "../utils/test-utils/factories";
import { DynUserRepository } from "./dyn-user-repository";

describe("DynUserRepository", () => {
  let repository: DynUserRepository;

  beforeAll(async () => {
    // Create repository instance
    repository = new DynUserRepository();
  });

  beforeEach(async () => {
    // Clean up users table before each test
    const client = createDynamoDBDocumentClient();
    const tableName = process.env.USERS_TABLE_NAME || "";
    await truncateTable(client, tableName, {
      partitionKey: "id",
    });
  });

  describe("findOneByEmail", () => {
    it("should find user by exact email match (lowercase)", async () => {
      const input = fakeCreateUserInput({ email: "user@example.com" });
      await repository.create(input);

      const result = await repository.findOneByEmail("user@example.com");

      expect(result).toBeDefined();
      expect(result?.email).toBe("user@example.com");
    });

    it("should return null when email not found", async () => {
      const result = await repository.findOneByEmail("nonexistent@example.com");

      expect(result).toBeNull();
    });

    it("should find correct user among multiple users", async () => {
      const user1Input = fakeCreateUserInput({ email: "user1@example.com" });
      const user2Input = fakeCreateUserInput({ email: "user2@example.com" });
      const user3Input = fakeCreateUserInput({ email: "user3@example.com" });

      const user1 = await repository.create(user1Input);
      await repository.create(user2Input);
      await repository.create(user3Input);

      const result = await repository.findOneByEmail("user1@example.com");

      expect(result).toBeDefined();
      expect(result?.id).toBe(user1.id);
      expect(result?.email).toBe("user1@example.com");
    });

    it("should find user with uppercase email (case-insensitive)", async () => {
      const input = fakeCreateUserInput({ email: "user@example.com" });
      await repository.create(input);

      const result = await repository.findOneByEmail("USER@EXAMPLE.COM");

      expect(result).toBeDefined();
      expect(result?.email).toBe("user@example.com");
    });

    it("should trim whitespace from email", async () => {
      const input = fakeCreateUserInput({ email: "user@example.com" });
      await repository.create(input);

      const result = await repository.findOneByEmail("  user@example.com  ");

      expect(result).toBeDefined();
      expect(result?.email).toBe("user@example.com");
    });

    it("should reject whitespace-only email", async () => {
      await expect(repository.findOneByEmail("   ")).rejects.toThrow(
        "Failed to find user by email",
      );
    });

    it("should return null for invalid email format", async () => {
      const result = await repository.findOneByEmail("not-an-email");
      expect(result).toBeNull();
    });

    it("should throw error if multiple users with same email found (data corruption)", async () => {
      const input1 = fakeCreateUserInput({ email: "dupe@example.com" });
      const input2 = fakeCreateUserInput({ email: "dupe@example.com" });

      // Manually create duplicates (bypassing normal constraints)
      await repository.create(input1);
      await repository.create(input2);

      // Should throw error due to data integrity issue
      await expect(
        repository.findOneByEmail("dupe@example.com"),
      ).rejects.toThrow(
        "Data integrity error: Multiple users found for email dupe@example.com",
      );
    });
  });

  describe("findOneById", () => {
    it("should find user by ID", async () => {
      // Arrange
      const created = await repository.create(fakeCreateUserInput());

      // Act
      const result = await repository.findOneById(created.id);

      // Assert
      expect(result).toEqual(created);
    });

    it("should return null when ID not found", async () => {
      const result = await repository.findOneById("nonexistent-id");

      expect(result).toBeNull();
    });

    it("should throw when ID is empty", async () => {
      await expect(repository.findOneById("")).rejects.toThrow();
    });
  });

  describe("findMany", () => {
    it("should return empty array when no users exist", async () => {
      // Act
      const result = await repository.findMany();

      // Assert
      expect(result).toEqual([]);
    });

    it("should return all created users", async () => {
      // Arrange
      const inputs = [
        fakeCreateUserInput(),
        fakeCreateUserInput(),
        fakeCreateUserInput(),
      ];

      const created = await Promise.all(
        inputs.map((input) => repository.create(input)),
      );

      // Act
      const result = await repository.findMany();

      // Assert
      expect(result).toHaveLength(3);
      result.forEach((user) => {
        expect(created).toContainEqual(user);
      });
    });

    it("should return all users with correct properties", async () => {
      // Arrange
      const input1 = fakeCreateUserInput();
      const input2 = fakeCreateUserInput();

      await repository.create(input1);
      await repository.create(input2);

      // Act
      const result = await repository.findMany();

      // Assert
      expect(result).toHaveLength(2);
      result.forEach((user) => {
        expect(user.id).toBeDefined();
        expect(user.email).toBeDefined();
        expect(user.createdAt).toBeDefined();
        expect(user.updatedAt).toBeDefined();
      });
    });

    it("should return users in any order", async () => {
      // Arrange
      const inputs = [
        fakeCreateUserInput(),
        fakeCreateUserInput(),
        fakeCreateUserInput(),
      ];

      const created = await Promise.all(
        inputs.map((input) => repository.create(input)),
      );

      // Act
      const result = await repository.findMany();

      // Assert - Results should contain all users regardless of order
      expect(result).toHaveLength(3);
      const resultIds = result.map((u) => u.id).sort();
      const createdIds = created.map((u) => u.id).sort();
      expect(resultIds).toEqual(createdIds);
    });
  });

  describe("create", () => {
    it("should create a user successfully", async () => {
      // Arrange
      const input = fakeCreateUserInput();

      // Act
      const result = await repository.create(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.email).toBe(input.email.toLowerCase());
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

    it("should normalize email to lowercase", async () => {
      // Arrange
      const input = fakeCreateUserInput({
        email: "Test.Email@EXAMPLE.COM",
      });

      // Act
      const result = await repository.create(input);

      // Assert
      expect(result.email).toBe("test.email@example.com");
    });

    it("should create multiple users", async () => {
      // Arrange
      const input1 = fakeCreateUserInput();
      const input2 = fakeCreateUserInput();

      // Act
      const result1 = await repository.create(input1);
      const result2 = await repository.create(input2);

      // Assert
      expect(result1.id).not.toBe(result2.id);
      expect(result1.email).not.toBe(result2.email);
    });

    it("should refetch created user from database to verify stored data", async () => {
      // Arrange
      const input = fakeCreateUserInput();

      // Act
      const created = await repository.create(input);
      const stored = await repository.findOneByEmail(created.email);

      // Assert
      expect(stored).toBeDefined();
      expect(stored).toEqual(created);
    });

    it("should throw error when required fields are missing during create", async () => {
      // Act & Assert - Missing email
      await expect(
        repository.create({
          email: "",
        }),
      ).rejects.toThrow();
    });
  });

  describe("ensureUser", () => {
    it("should create user if not exists", async () => {
      // Arrange
      const email = faker.internet.email().toLowerCase();

      // Act
      const result = await repository.ensureUser(email);

      // Assert
      expect(result.email).toBe(email);
      expect(result.id).toBeDefined();

      // Verify user was actually created in database
      const stored = await repository.findOneByEmail(email);
      expect(stored).toEqual(result);
    });

    it("should return existing user if already exists (idempotent)", async () => {
      // Arrange
      const input = fakeCreateUserInput();
      const created = await repository.create(input);

      // Act
      const result1 = await repository.ensureUser(created.email);
      const result2 = await repository.ensureUser(created.email);

      // Assert - Both calls return the same user
      expect(result1).toEqual(created);
      expect(result2).toEqual(created);
      expect(result1.id).toBe(result2.id);
    });

    it("should handle case-insensitive email matching in ensureUser", async () => {
      const email = "Test@Example.COM";

      // Create user with mixed-case email
      const created = await repository.ensureUser(email);

      // Try to ensure user again with different case
      const result = await repository.ensureUser("test@example.com");

      // Should return the same user
      expect(result.id).toBe(created.id);
      expect(result.email).toBe("test@example.com");
    });

    it("should not create duplicates on multiple calls", async () => {
      // Arrange
      const email = faker.internet.email().toLowerCase();

      // Act - Call ensureUser three times with same email
      const result1 = await repository.ensureUser(email);
      const result2 = await repository.ensureUser(email);
      const result3 = await repository.ensureUser(email);

      // Assert - All calls return the same user ID
      expect(result1.id).toBe(result2.id);
      expect(result2.id).toBe(result3.id);

      // Verify only one user exists in database
      const allUsers = await repository.findMany();
      expect(allUsers).toHaveLength(1);
    });

    it("should throw error when receiving invalid input", async () => {
      // Act & Assert - Empty email
      await expect(repository.ensureUser("")).rejects.toThrow();
    });
  });

  describe("update", () => {
    it("should update voiceInputLanguage", async () => {
      // Arrange
      const created = await repository.create(fakeCreateUserInput());

      // Act
      const result = await repository.update(created.id, {
        voiceInputLanguage: "pl-PL",
      });

      // Assert
      expect(result.voiceInputLanguage).toBe("pl-PL");
      expect(result.id).toBe(created.id);
      expect(result.email).toBe(created.email);
      expect(result.updatedAt).not.toBe(created.updatedAt);
    });

    it("should update transactionPatternsLimit", async () => {
      // Arrange
      const created = await repository.create(fakeCreateUserInput());

      // Act
      const result = await repository.update(created.id, {
        transactionPatternsLimit: 5,
      });

      // Assert
      expect(result.transactionPatternsLimit).toBe(5);
    });

    it("should update both fields at once", async () => {
      // Arrange
      const created = await repository.create(fakeCreateUserInput());

      // Act
      const result = await repository.update(created.id, {
        voiceInputLanguage: "de-DE",
        transactionPatternsLimit: 7,
      });

      // Assert
      expect(result.voiceInputLanguage).toBe("de-DE");
      expect(result.transactionPatternsLimit).toBe(7);
    });

    it("should throw NOT_FOUND for nonexistent user ID", async () => {
      await expect(
        repository.update("nonexistent-id", { voiceInputLanguage: "en-US" }),
      ).rejects.toThrow();
    });

    it("should throw when ID is empty", async () => {
      await expect(
        repository.update("", { voiceInputLanguage: "en-US" }),
      ).rejects.toThrow();
    });
  });

  describe("hydration - data corruption detection", () => {
    it("should throw error when required field createdAt is missing from database record", async () => {
      // Arrange
      const input = fakeCreateUserInput();
      const created = await repository.create(input);
      const client = createDynamoDBDocumentClient();

      // Manually corrupt the database record by removing createdAt
      const tableName = process.env.USERS_TABLE_NAME || "";
      await client.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { id: created.id },
          UpdateExpression: "REMOVE createdAt",
        }),
      );

      // Act & Assert - findMany scans all records, will trigger hydration
      await expect(repository.findMany()).rejects.toThrow();
    });
  });
});
