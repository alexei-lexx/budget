import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { User } from "../models/user";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import { requireEnv } from "../utils/require-env";
import { truncateTable } from "../utils/test-utils/dynamodb-helpers";
import {
  fakeCreateUserInput,
  fakeUser,
} from "../utils/test-utils/models/user-fakes";
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
      const user = User.create(
        fakeCreateUserInput({ email: "user@example.com" }),
      );
      await repository.create(user);

      // Act
      const result = await repository.findOneByEmail("user@example.com");

      // Assert
      expect(result?.email).toBe("user@example.com");
    });

    it("returns matching user when multiple users exist", async () => {
      // Arrange
      const target = User.create(
        fakeCreateUserInput({ email: "user1@example.com" }),
      );
      await repository.create(target);
      await repository.create(
        User.create(fakeCreateUserInput({ email: "user2@example.com" })),
      );
      await repository.create(
        User.create(fakeCreateUserInput({ email: "user3@example.com" })),
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
        User.create(fakeCreateUserInput({ email: "user@example.com" })),
      );

      // Act
      const result = await repository.findOneByEmail("USER@EXAMPLE.COM");

      // Assert
      expect(result?.email).toBe("user@example.com");
    });

    it("trims whitespace from email", async () => {
      // Arrange
      await repository.create(
        User.create(fakeCreateUserInput({ email: "user@example.com" })),
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
        User.create(fakeCreateUserInput({ email: "dupe@example.com" })),
      );
      await repository.create(
        User.create(fakeCreateUserInput({ email: "dupe@example.com" })),
      );

      // Act & Assert
      await expect(
        repository.findOneByEmail("dupe@example.com"),
      ).rejects.toThrow(
        "Data integrity error: Multiple users found for email dupe@example.com",
      );
    });
  });

  describe("findOneByMcpToken", () => {
    // Happy path

    it("returns user by exact mcpToken match", async () => {
      // Arrange
      const user = User.create(fakeCreateUserInput(), {
        tokenGenerator: () => "token-1",
      });
      await repository.create(user);

      // Act
      const result = await repository.findOneByMcpToken("token-1");

      // Assert
      expect(result?.id).toBe(user.id);
    });

    it("returns null when mcpToken not found", async () => {
      // Act
      const result = await repository.findOneByMcpToken("nonexistent-token");

      // Assert
      expect(result).toBeNull();
    });

    // Dependency failures

    it("throws when multiple users share same mcpToken", async () => {
      // Arrange
      // Create duplicate users with same mcpToken
      await repository.create(
        User.create(fakeCreateUserInput(), {
          tokenGenerator: () => "dupe-token",
        }),
      );
      await repository.create(
        User.create(fakeCreateUserInput(), {
          tokenGenerator: () => "dupe-token",
        }),
      );

      // Act & Assert
      await expect(repository.findOneByMcpToken("dupe-token")).rejects.toThrow(
        "Data integrity error: Multiple users found for mcpToken",
      );
    });
  });

  describe("findOneById", () => {
    // Happy path

    it("returns user by id", async () => {
      // Arrange
      const user = User.create(fakeCreateUserInput());
      await repository.create(user);

      // Act
      const result = await repository.findOneById(user.id);

      // Assert
      expect(result?.toData()).toEqual(user.toData());
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
      const users = [
        User.create(fakeCreateUserInput()),
        User.create(fakeCreateUserInput()),
        User.create(fakeCreateUserInput()),
      ];
      await Promise.all(users.map((user) => repository.create(user)));

      // Act
      const result = await repository.findMany();

      // Assert
      expect(result).toHaveLength(3);
      expect(result.map((user) => user.id).sort()).toEqual(
        users.map((user) => user.id).sort(),
      );
    });
  });

  describe("create", () => {
    // Happy path

    it("persists user", async () => {
      // Arrange
      const user = User.create(fakeCreateUserInput());

      // Act
      const result = await repository.create(user);
      const stored = await repository.findOneById(user.id);

      // Assert
      expect(result).toBeUndefined();
      expect(stored?.toData()).toEqual(user.toData());
    });

    // Dependency failures

    it("rejects duplicate id", async () => {
      // Arrange
      const user = User.create(fakeCreateUserInput());
      await repository.create(user);

      // Act & Assert
      await expect(repository.create(user)).rejects.toThrow(
        "Failed to create user",
      );
    });
  });

  describe("update", () => {
    // Happy path

    it("updates mcp token", async () => {
      // Arrange
      const user = User.create(fakeCreateUserInput());
      await repository.create(user);
      const updated = user.regenerateMcpToken({
        tokenGenerator: () => "new-token",
      });

      // Act
      await repository.update(updated);
      const stored = await repository.findOneById(user.id);

      // Assert
      expect(stored?.mcpToken).toBe("new-token");
    });

    it("updates voice input language", async () => {
      // Arrange
      const user = User.create(fakeCreateUserInput());
      await repository.create(user);
      const updated = user.update({ voiceInputLanguage: "pl-PL" });

      // Act
      await repository.update(updated);
      const stored = await repository.findOneById(user.id);

      // Assert
      expect(stored?.voiceInputLanguage).toBe("pl-PL");
      expect(stored?.id).toBe(user.id);
      expect(stored?.email).toBe(user.email);
    });

    it("updates interface language", async () => {
      // Arrange
      const user = User.create(fakeCreateUserInput());
      await repository.create(user);
      const updated = user.update({ interfaceLanguage: "de" });

      // Act
      await repository.update(updated);
      const stored = await repository.findOneById(user.id);

      // Assert
      expect(stored?.interfaceLanguage).toBe("de");
      expect(stored?.id).toBe(user.id);
      expect(stored?.email).toBe(user.email);
    });

    it("hydrates missing interface language as undefined", async () => {
      // Arrange
      const user = User.create(fakeCreateUserInput());
      await repository.create(user);

      // Act
      const stored = await repository.findOneById(user.id);

      // Assert
      expect(stored?.interfaceLanguage).toBeUndefined();
    });

    it("updates transaction patterns limit", async () => {
      // Arrange
      const user = User.create(fakeCreateUserInput());
      await repository.create(user);
      const updated = user.update({ transactionPatternsLimit: 5 });

      // Act
      await repository.update(updated);
      const stored = await repository.findOneById(user.id);

      // Assert
      expect(stored?.transactionPatternsLimit).toBe(5);
    });

    it("updates multiple fields in one call", async () => {
      // Arrange
      const user = User.create(fakeCreateUserInput());
      await repository.create(user);
      const updated = user.update({
        voiceInputLanguage: "de-DE",
        transactionPatternsLimit: 7,
      });

      // Act
      await repository.update(updated);
      const stored = await repository.findOneById(user.id);

      // Assert
      expect(stored?.voiceInputLanguage).toBe("de-DE");
      expect(stored?.transactionPatternsLimit).toBe(7);
    });

    // Dependency failures

    it("throws when user not found", async () => {
      // Arrange
      const user = fakeUser();

      // Act & Assert
      await expect(repository.update(user)).rejects.toMatchObject({
        message: "User not found",
        code: "NOT_FOUND",
      });
    });
  });

  describe("hydration - data corruption detection", () => {
    it("throws when stored record is missing required field", async () => {
      // Arrange
      const user = User.create(fakeCreateUserInput());
      await repository.create(user);

      // Corrupt record by removing createdAt to trigger hydration failure
      await client.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { id: user.id },
          UpdateExpression: "REMOVE createdAt",
        }),
      );

      // Act & Assert
      await expect(repository.findMany()).rejects.toThrow();
    });
  });
});
