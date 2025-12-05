import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { faker } from "@faker-js/faker";
import { truncateTable } from "../__tests__/utils/dynamodbHelpers";
import { fakeCreateAccountInput } from "../__tests__/utils/factories";
import { createDynamoDBDocumentClient } from "../utils/dynamoClient";
import { AccountRepository } from "./AccountRepository";

describe("AccountRepository", () => {
  let repository: AccountRepository;
  const userId = faker.string.uuid();

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

  describe("findByIds", () => {
    it("should return accounts when IDs exist", async () => {
      // Arrange
      const account1 = await repository.create(
        fakeCreateAccountInput({ userId }),
      );
      const account2 = await repository.create(
        fakeCreateAccountInput({ userId }),
      );

      // Act
      const result = await repository.findByIds(
        [account1.id, account2.id],
        userId,
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(account1);
      expect(result).toContainEqual(account2);
    });

    it("should return empty array when IDs are empty", async () => {
      // Act
      const result = await repository.findByIds([], userId);

      // Assert
      expect(result).toEqual([]);
    });

    it("should return only found accounts when some IDs are missing", async () => {
      // Arrange
      const account = await repository.create(
        fakeCreateAccountInput({ userId }),
      );

      // Act
      const result = await repository.findByIds(
        [account.id, "nonexistent-id"],
        userId,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(account);
    });

    it("should throw error when userId is missing", async () => {
      // Act & Assert
      await expect(repository.findByIds(["account-1"], "")).rejects.toThrow(
        "User ID is required",
      );
    });

    it("should return archived accounts (not filtered)", async () => {
      // Arrange
      const account = await repository.create(
        fakeCreateAccountInput({ userId }),
      );
      await repository.archive(account.id, userId);

      // Act
      const result = await repository.findByIds([account.id], userId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.isArchived).toBe(true);
    });
  });

  describe("hydration - data corruption detection", () => {
    it("should throw error when required field initialBalance is missing from database record", async () => {
      // Arrange
      const account = await repository.create(
        fakeCreateAccountInput({ userId }),
      );
      const client = createDynamoDBDocumentClient();

      // Manually corrupt the database record by removing initialBalance
      const tableName = process.env.ACCOUNTS_TABLE_NAME || "";
      await client.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { userId, id: account.id },
          UpdateExpression: "REMOVE initialBalance",
        }),
      );

      // Act & Assert
      await expect(
        repository.findByIds([account.id], userId),
      ).rejects.toThrow();
    });
  });
});
