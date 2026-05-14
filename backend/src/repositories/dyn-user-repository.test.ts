import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { faker } from "@faker-js/faker";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import { requireEnv } from "../utils/require-env";
import { truncateTable } from "../utils/test-utils/dynamodb-helpers";
import { fakeCreateUserInput } from "../utils/test-utils/repositories/user-repository-fakes";
import { DynUserRepository } from "./dyn-user-repository";

describe("DynUserRepository", () => {
  let repository: DynUserRepository;

  const tableName = requireEnv("USERS_TABLE_NAME");
  const client = createDynamoDBDocumentClient();

  beforeAll(async () => {
    // Create repository instance
    repository = new DynUserRepository(tableName, client);
  });

  beforeEach(async () => {
    // Clean up users table before each test
    await truncateTable(client, tableName, {
      partitionKey: "id",
    });
  });

  describe("findOneByEmail", () => {
    // Happy path

    it("returns user by exact email match", async () => {
      // Arrange
      await repository.create(
        fakeCreateUserInput({ email: "user@example.com" }),
      );

      // Act
      const result = await repository.findOneByEmail("user@example.com");

      // Assert
      expect(result?.email).toBe("user@example.com");
    });

    it("returns matching user when multiple users exist", async () => {
      // Arrange
      const target = await repository.create(
        fakeCreateUserInput({ email: "user1@example.com" }),
      );
      await repository.create(
        fakeCreateUserInput({ email: "user2@example.com" }),
      );
      await repository.create(
        fakeCreateUserInput({ email: "user3@example.com" }),
      );

      // Act
      const result = await repository.findOneByEmail("user1@example.com");

      // Assert
      expect(result?.id).toBe(target.id);
      expect(result?.email).toBe("user1@example.com");
    });

    it("matches email case-insensitively", async () => {
      // Arrange
      await repository.create(
        fakeCreateUserInput({ email: "user@example.com" }),
      );

      // Act
      const result = await repository.findOneByEmail("USER@EXAMPLE.COM");

      // Assert
      expect(result?.email).toBe("user@example.com");
    });

    it("trims whitespace from email", async () => {
      // Arrange
      await repository.create(
        fakeCreateUserInput({ email: "user@example.com" }),
      );

      // Act
      const result = await repository.findOneByEmail("  user@example.com  ");

      // Assert
      expect(result?.email).toBe("user@example.com");
    });

    it("returns null when email not found", async () => {
      // Act
      const result = await repository.findOneByEmail("nonexistent@example.com");

      // Assert
      expect(result).toBeNull();
    });

    // Validation failures

    it("throws when email is whitespace-only", async () => {
      // Act & Assert
      await expect(repository.findOneByEmail("   ")).rejects.toThrow(
        "Failed to find user by email",
      );
    });

    // Dependency failures

    it("throws when multiple users share same email", async () => {
      // Arrange
      // Create duplicate users with same email
      await repository.create(
        fakeCreateUserInput({ email: "dupe@example.com" }),
      );
      await repository.create(
        fakeCreateUserInput({ email: "dupe@example.com" }),
      );

      // Act & Assert
      await expect(
        repository.findOneByEmail("dupe@example.com"),
      ).rejects.toThrow(
        "Data integrity error: Multiple users found for email dupe@example.com",
      );
    });
  });

  describe("findOneById", () => {
    // Happy path

    it("returns user by id", async () => {
      // Arrange
      const created = await repository.create(fakeCreateUserInput());

      // Act
      const result = await repository.findOneById(created.id);

      // Assert
      expect(result).toEqual(created);
    });

    it("returns null when id not found", async () => {
      // Act
      const result = await repository.findOneById("nonexistent-id");

      // Assert
      expect(result).toBeNull();
    });

    // Validation failures

    it("throws when id is empty", async () => {
      // Act & Assert
      await expect(repository.findOneById("")).rejects.toMatchObject({
        message: "User ID is required",
        code: "INVALID_PARAMETERS",
      });
    });
  });

  describe("findMany", () => {
    // Happy path

    it("returns empty array when no users exist", async () => {
      // Act
      const result = await repository.findMany();

      // Assert
      expect(result).toEqual([]);
    });

    it("returns all created users", async () => {
      // Arrange
      const created = await Promise.all([
        repository.create(fakeCreateUserInput()),
        repository.create(fakeCreateUserInput()),
        repository.create(fakeCreateUserInput()),
      ]);

      // Act
      const result = await repository.findMany();

      // Assert
      expect(result).toHaveLength(3);
      expect(result.map((user) => user.id).sort()).toEqual(
        created.map((user) => user.id).sort(),
      );
    });
  });

  describe("create", () => {
    // Happy path

    it("creates user with id and timestamps", async () => {
      // Arrange
      const input = fakeCreateUserInput();

      // Act
      const result = await repository.create(input);

      // Assert
      expect(result.email).toBe(input.email.toLowerCase());
      expect(result.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(result.createdAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(result.createdAt).toBe(result.updatedAt);
    });

    it("normalizes email to lowercase", async () => {
      // Arrange
      const input = fakeCreateUserInput({ email: "Test.Email@EXAMPLE.COM" });

      // Act
      const result = await repository.create(input);

      // Assert
      expect(result.email).toBe("test.email@example.com");
    });

    it("assigns distinct ids to separate users", async () => {
      // Arrange
      const input1 = fakeCreateUserInput();
      const input2 = fakeCreateUserInput();

      // Act
      const result1 = await repository.create(input1);
      const result2 = await repository.create(input2);

      // Assert
      expect(result1.id).not.toBe(result2.id);
    });

    it("persists user", async () => {
      // Arrange
      const input = fakeCreateUserInput();

      // Act
      const created = await repository.create(input);
      const stored = await repository.findOneById(created.id);

      // Assert
      expect(stored).toEqual(created);
    });

    // Validation failures

    it("throws when email is empty", async () => {
      // Act & Assert
      await expect(repository.create({ email: "" })).rejects.toThrow();
    });
  });

  describe("ensureUser", () => {
    // Happy path

    it("creates user when email does not exist", async () => {
      // Arrange
      const email = faker.internet.email().toLowerCase();

      // Act
      const result = await repository.ensureUser(email);

      // Assert
      expect(result.email).toBe(email);
      expect(result.id).toBeDefined();

      const stored = await repository.findOneByEmail(email);
      expect(stored).toEqual(result);
    });

    it("returns existing user when email exists", async () => {
      // Arrange
      const created = await repository.create(fakeCreateUserInput());

      // Act
      const result = await repository.ensureUser(created.email);

      // Assert
      expect(result).toEqual(created);
    });

    it("matches existing user case-insensitively", async () => {
      // Arrange
      const created = await repository.ensureUser("Test@Example.COM");

      // Act
      const result = await repository.ensureUser("test@example.com");

      // Assert
      expect(result.id).toBe(created.id);
      expect(result.email).toBe("test@example.com");
    });

    it("returns same user across repeated calls", async () => {
      // Arrange
      const email = faker.internet.email().toLowerCase();

      // Act
      const result1 = await repository.ensureUser(email);
      const result2 = await repository.ensureUser(email);
      const result3 = await repository.ensureUser(email);

      // Assert
      expect(result1.id).toBe(result2.id);
      expect(result2.id).toBe(result3.id);

      const allUsers = await repository.findMany();
      expect(allUsers).toHaveLength(1);
    });

    // Validation failures

    it("throws when email is empty", async () => {
      // Act & Assert
      await expect(repository.ensureUser("")).rejects.toThrow();
    });
  });

  describe("update", () => {
    // Happy path

    it("updates voice input language", async () => {
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

    it("updates transaction patterns limit", async () => {
      // Arrange
      const created = await repository.create(fakeCreateUserInput());

      // Act
      const result = await repository.update(created.id, {
        transactionPatternsLimit: 5,
      });

      // Assert
      expect(result.transactionPatternsLimit).toBe(5);
    });

    it("updates multiple fields in one call", async () => {
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

    // Validation failures

    it("throws when id is empty", async () => {
      // Act & Assert
      await expect(
        repository.update("", { voiceInputLanguage: "en-US" }),
      ).rejects.toThrow();
    });

    it("throws when user not found", async () => {
      // Act & Assert
      await expect(
        repository.update("nonexistent-id", { voiceInputLanguage: "en-US" }),
      ).rejects.toThrow();
    });
  });

  describe("hydration - data corruption detection", () => {
    it("throws when stored record is missing required field", async () => {
      // Arrange
      const created = await repository.create(fakeCreateUserInput());

      // Corrupt record by removing createdAt to trigger hydration failure
      await client.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { id: created.id },
          UpdateExpression: "REMOVE createdAt",
        }),
      );

      // Act & Assert
      await expect(repository.findMany()).rejects.toThrow();
    });
  });
});
