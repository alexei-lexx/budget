import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { faker } from "@faker-js/faker";
import { UserRepository } from "./UserRepository";
import { createDynamoDBDocumentClient } from "./utils/dynamoClient";
import { truncateTable } from "../__tests__/utils/dynamodbHelpers";
import { fakeCreateUserInput } from "../__tests__/utils/factories";

describe("UserRepository", () => {
  let repository: UserRepository;

  beforeAll(async () => {
    // Create repository instance
    repository = new UserRepository();
  });

  beforeEach(async () => {
    // Clean up users table before each test
    const client = createDynamoDBDocumentClient();
    const tableName = process.env.USERS_TABLE_NAME || "";
    await truncateTable(client, tableName, {
      partitionKey: "id",
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
      expect(result.auth0UserId).toBe(input.auth0UserId);
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

    it("should create multiple users with different auth0UserIds", async () => {
      // Arrange
      const input1 = fakeCreateUserInput();
      const input2 = fakeCreateUserInput();

      // Act
      const result1 = await repository.create(input1);
      const result2 = await repository.create(input2);

      // Assert
      expect(result1.id).not.toBe(result2.id);
      expect(result1.auth0UserId).not.toBe(result2.auth0UserId);
      expect(result1.email).not.toBe(result2.email);
    });

    it("should refetch created user from database to verify stored data", async () => {
      // Arrange
      const input = fakeCreateUserInput();

      // Act
      const created = await repository.create(input);
      const stored = await repository.findByAuth0UserId(created.auth0UserId);

      // Assert
      expect(stored).toBeDefined();
      expect(stored).toEqual(created);
    });

    it("should throw error when required fields are missing during create", async () => {
      // Act & Assert - Missing auth0UserId
      await expect(
        repository.create({
          auth0UserId: "",
          email: "test@example.com",
        }),
      ).rejects.toThrow();
    });
  });

  describe("findByAuth0UserId", () => {
    it("should find user by auth0UserId", async () => {
      // Arrange
      const input = fakeCreateUserInput();
      const created = await repository.create(input);

      // Act
      const result = await repository.findByAuth0UserId(created.auth0UserId);

      // Assert
      expect(result).toBeDefined();
      expect(result).toEqual(created);
      expect(result?.auth0UserId).toBe(created.auth0UserId);
    });

    it("should return null when auth0UserId does not exist", async () => {
      // Act
      const result = await repository.findByAuth0UserId("auth0|nonexistent-id");

      // Assert
      expect(result).toBeNull();
    });

    it("should find correct user among multiple users", async () => {
      // Arrange
      const user1Input = fakeCreateUserInput();
      const user2Input = fakeCreateUserInput();
      const user3Input = fakeCreateUserInput();

      const user1 = await repository.create(user1Input);
      await repository.create(user2Input);
      await repository.create(user3Input);

      // Act
      const result = await repository.findByAuth0UserId(user1.auth0UserId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(user1.id);
      expect(result?.auth0UserId).toBe(user1.auth0UserId);
      expect(result?.email).toBe(user1.email);
    });

    it("should be case-sensitive for auth0UserId", async () => {
      // Arrange
      const input = fakeCreateUserInput();
      await repository.create(input);

      // Act
      const result = await repository.findByAuth0UserId(
        input.auth0UserId.toUpperCase(),
      );

      // Assert - Should not find it because of case sensitivity
      expect(result).toBeNull();
    });

    it("should throw error when auth0UserId is empty", async () => {
      // Act & Assert
      await expect(repository.findByAuth0UserId("")).rejects.toThrow();
    });

    it("should handle multiple users with different auth0UserIds correctly", async () => {
      // Arrange
      const inputs = [
        fakeCreateUserInput(),
        fakeCreateUserInput(),
        fakeCreateUserInput(),
      ];

      const created = await Promise.all(
        inputs.map((input) => repository.create(input)),
      );

      // Act - Find each user individually
      const results = await Promise.all(
        created.map((user) => repository.findByAuth0UserId(user.auth0UserId)),
      );

      // Assert - Each result should match the created user
      results.forEach((result, index) => {
        expect(result).toEqual(created[index]);
      });
    });
  });

  describe("findAll", () => {
    it("should return empty array when no users exist", async () => {
      // Act
      const result = await repository.findAll();

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
      const result = await repository.findAll();

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
      const result = await repository.findAll();

      // Assert
      expect(result).toHaveLength(2);
      result.forEach((user) => {
        expect(user.id).toBeDefined();
        expect(user.auth0UserId).toBeDefined();
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
      const result = await repository.findAll();

      // Assert - Results should contain all users regardless of order
      expect(result).toHaveLength(3);
      const resultIds = result.map((u) => u.id).sort();
      const createdIds = created.map((u) => u.id).sort();
      expect(resultIds).toEqual(createdIds);
    });
  });

  describe("ensureUser", () => {
    it("should create user if not exists", async () => {
      // Arrange
      const auth0UserId = `auth0|${faker.string.uuid()}`;
      const email = faker.internet.email().toLowerCase();

      // Act
      const result = await repository.ensureUser(auth0UserId, email);

      // Assert
      expect(result.auth0UserId).toBe(auth0UserId);
      expect(result.email).toBe(email);
      expect(result.id).toBeDefined();

      // Verify user was actually created in database
      const stored = await repository.findByAuth0UserId(auth0UserId);
      expect(stored).toEqual(result);
    });

    it("should return existing user if already exists (idempotent)", async () => {
      // Arrange
      const input = fakeCreateUserInput();
      const created = await repository.create(input);

      // Act
      const result1 = await repository.ensureUser(
        created.auth0UserId,
        created.email,
      );
      const result2 = await repository.ensureUser(
        created.auth0UserId,
        created.email,
      );

      // Assert - Both calls return the same user
      expect(result1).toEqual(created);
      expect(result2).toEqual(created);
      expect(result1.id).toBe(result2.id);
    });

    it("should not create duplicates on multiple calls", async () => {
      // Arrange
      const auth0UserId = `auth0|${faker.string.uuid()}`;
      const email = faker.internet.email().toLowerCase();

      // Act - Call ensureUser three times with same auth0UserId
      const result1 = await repository.ensureUser(auth0UserId, email);
      const result2 = await repository.ensureUser(auth0UserId, email);
      const result3 = await repository.ensureUser(auth0UserId, email);

      // Assert - All calls return the same user ID
      expect(result1.id).toBe(result2.id);
      expect(result2.id).toBe(result3.id);

      // Verify only one user exists in database
      const allUsers = await repository.findAll();
      expect(allUsers).toHaveLength(1);
    });

    it("should throw error when receiving invalid input", async () => {
      // Act & Assert - Empty auth0UserId
      await expect(
        repository.ensureUser("", "test@example.com"),
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

      // Act & Assert - findAll scans all records, will trigger hydration
      await expect(repository.findAll()).rejects.toThrow();
    });
  });
});
