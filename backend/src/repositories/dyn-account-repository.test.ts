import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { faker } from "@faker-js/faker";
import { beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { Account } from "../models/account";
import {
  RepositoryError,
  VersionConflictError,
} from "../ports/repository-error";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import { requireEnv } from "../utils/require-env";
import { truncateTable } from "../utils/test-utils/dynamodb-helpers";
import { fakeCreateAccountInput } from "../utils/test-utils/models/account-fakes";
import { DynAccountRepository } from "./dyn-account-repository";

describe("DynAccountRepository", () => {
  let repository: DynAccountRepository;
  const userId = faker.string.uuid();
  const tableName = requireEnv("ACCOUNTS_TABLE_NAME");

  beforeAll(async () => {
    // Create repository instance
    repository = new DynAccountRepository(tableName);
  });

  beforeEach(async () => {
    // Clean up accounts table before each test
    const client = createDynamoDBDocumentClient();
    await truncateTable(client, tableName, {
      partitionKey: "userId",
      sortKey: "id",
    });
  });

  describe("findOneById", () => {
    // Happy path

    it("returns account when it exists", async () => {
      // Arrange
      const account = Account.create(fakeCreateAccountInput({ userId }));
      await repository.create(account);

      // Act
      const result = await repository.findOneById({ id: account.id, userId });

      // Assert
      expect(result?.toData()).toEqual(account.toData());
    });

    it("returns null when account does not exist", async () => {
      // Act
      const result = await repository.findOneById({
        id: faker.string.uuid(),
        userId,
      });

      // Assert
      expect(result).toBeNull();
    });

    it("returns null when account is archived", async () => {
      // Arrange
      const account = Account.create(fakeCreateAccountInput({ userId }));
      await repository.create(account);
      await repository.update(account.archive());

      // Act
      const result = await repository.findOneById({ id: account.id, userId });

      // Assert
      expect(result).toBeNull();
    });

    it("returns null when account belongs to another user", async () => {
      // Arrange
      const otherUserId = faker.string.uuid();
      const account = Account.create(
        fakeCreateAccountInput({ userId: otherUserId }),
      );
      await repository.create(account);

      // Act
      const result = await repository.findOneById({ id: account.id, userId });

      // Assert
      expect(result).toBeNull();
    });

    // Validation failures

    it("throws when id is missing", async () => {
      // Act & Assert
      await expect(
        repository.findOneById({ id: "", userId }),
      ).rejects.toThrow("Account ID is required");
    });

    it("throws when userId is missing", async () => {
      // Act & Assert
      await expect(
        repository.findOneById({ id: faker.string.uuid(), userId: "" }),
      ).rejects.toThrow("User ID is required");
    });
  });

  describe("findManyByUserId", () => {
    // Happy path

    it("does not return accounts from other users", async () => {
      // Arrange
      const otherUserId = faker.string.uuid();
      await repository.create(
        Account.create(fakeCreateAccountInput({ userId })),
      );
      await repository.create(
        Account.create(fakeCreateAccountInput({ userId: otherUserId })),
      );

      // Act
      const result = await repository.findManyByUserId(userId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.userId).toBe(userId);
    });

    // Validation failures

    it("throws when userId is missing", async () => {
      // Act & Assert
      await expect(repository.findManyByUserId("")).rejects.toThrow(
        "User ID is required",
      );
    });
  });

  describe("findManyWithArchivedByIds", () => {
    // Happy path

    it("returns accounts when ids exist", async () => {
      // Arrange
      const account1 = Account.create(fakeCreateAccountInput({ userId }));
      const account2 = Account.create(fakeCreateAccountInput({ userId }));
      await repository.create(account1);
      await repository.create(account2);

      // Act
      const result = await repository.findManyWithArchivedByIds({
        ids: [account1.id, account2.id],
        userId,
      });

      // Assert
      expect(result.map((account) => account.id).sort()).toEqual(
        [account1.id, account2.id].sort(),
      );
    });

    it("returns empty array when ids are empty", async () => {
      // Act
      const result = await repository.findManyWithArchivedByIds({
        ids: [],
        userId,
      });

      // Assert
      expect(result).toEqual([]);
    });

    it("returns only found accounts when some ids are missing", async () => {
      // Arrange
      const account = Account.create(fakeCreateAccountInput({ userId }));
      await repository.create(account);

      // Act
      const result = await repository.findManyWithArchivedByIds({
        ids: [account.id, faker.string.uuid()],
        userId,
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(account.id);
    });

    it("includes archived accounts", async () => {
      // Arrange
      const account = Account.create(fakeCreateAccountInput({ userId }));
      await repository.create(account);
      await repository.update(account.archive());

      // Act
      const result = await repository.findManyWithArchivedByIds({
        ids: [account.id],
        userId,
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.isArchived).toBe(true);
    });

    // Validation failures

    it("throws when userId is missing", async () => {
      // Act & Assert
      await expect(
        repository.findManyWithArchivedByIds({
          ids: [faker.string.uuid()],
          userId: "",
        }),
      ).rejects.toThrow("User ID is required");
    });
  });

  describe("findManyWithArchivedByUserId", () => {
    // Happy path

    it("returns all accounts including archived", async () => {
      // Arrange
      const active = Account.create(fakeCreateAccountInput({ userId }));
      const archived = Account.create(fakeCreateAccountInput({ userId }));
      await repository.create(active);
      await repository.create(archived);
      await repository.update(archived.archive());

      // Act
      const result = await repository.findManyWithArchivedByUserId(userId);

      // Assert
      expect(result).toHaveLength(2);
      const activeResult = result.find((account) => account.id === active.id);
      const archivedResult = result.find(
        (account) => account.id === archived.id,
      );
      expect(activeResult?.isArchived).toBe(false);
      expect(archivedResult?.isArchived).toBe(true);
    });

    // Validation failures

    it("throws when userId is missing", async () => {
      // Act & Assert
      await expect(repository.findManyWithArchivedByUserId("")).rejects.toThrow(
        "User ID is required",
      );
    });
  });

  describe("create", () => {
    // Happy path

    it("persists account", async () => {
      // Arrange
      const account = Account.create(fakeCreateAccountInput({ userId }));

      // Act
      const result = await repository.create(account);

      // Assert
      expect(result).toBeUndefined();

      const stored = await repository.findOneById({
        id: account.id,
        userId,
      });
      expect(stored?.toData()).toEqual(account.toData());
      expect(stored?.version).toBe(0);
    });

    // Validation failures

    it("rejects duplicate id", async () => {
      // Arrange
      const account = Account.create(fakeCreateAccountInput({ userId }));
      await repository.create(account);

      // Act & Assert
      await expect(repository.create(account)).rejects.toThrow(RepositoryError);
    });
  });

  describe("update", () => {
    // Happy path

    it("persists changes and bumps version", async () => {
      // Arrange
      const account = Account.create(
        fakeCreateAccountInput({ userId, name: "Cash", initialBalance: 100 }),
      );
      await repository.create(account);

      // Act
      const result = await repository.update(
        account.update({ name: "Wallet", initialBalance: 250 }),
      );

      // Assert
      expect(result.name).toBe("Wallet");
      expect(result.initialBalance).toBe(250);
      expect(result.version).toBe(account.version + 1);

      const reloaded = await repository.findOneById({
        id: account.id,
        userId,
      });
      expect(reloaded?.toData()).toEqual(result.toData());
    });

    it("archives account", async () => {
      // Arrange
      const account = Account.create(fakeCreateAccountInput({ userId }));
      await repository.create(account);

      // Act
      await repository.update(account.archive());

      // Assert — findOneById returns null for archived rows.
      const reloaded = await repository.findOneById({
        id: account.id,
        userId,
      });
      expect(reloaded).toBeNull();
    });

    // Validation failures

    it("throws VersionConflictError when version is stale", async () => {
      // Arrange — row at v0, then bumped to v1 by first update
      const account = Account.create(fakeCreateAccountInput({ userId }));
      await repository.create(account);

      const firstUpdate = await repository.update(
        account.update({ name: "First" }),
      );
      expect(firstUpdate.version).toBe(1);

      // Act & Assert — second update from original v=0 entity
      await expect(
        repository.update(account.update({ name: "Second" })),
      ).rejects.toThrow(VersionConflictError);
    });

    it("throws VersionConflictError for non-existent record", async () => {
      // Arrange — entity built but never persisted
      const ghost = Account.create(fakeCreateAccountInput({ userId }));

      // Act & Assert
      await expect(
        repository.update(ghost.update({ name: "Ghost-2" })),
      ).rejects.toThrow(VersionConflictError);
    });
  });

  describe("hydration - data corruption detection", () => {
    it("throws when required field initialBalance is missing from database record", async () => {
      // Arrange
      const account = Account.create(fakeCreateAccountInput({ userId }));
      await repository.create(account);
      const client = createDynamoDBDocumentClient();

      // Manually corrupt the database record by removing initialBalance
      await client.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { userId, id: account.id },
          UpdateExpression: "REMOVE initialBalance",
        }),
      );

      // Act & Assert
      await expect(
        repository.findManyWithArchivedByIds({ ids: [account.id], userId }),
      ).rejects.toThrow();
    });
  });
});
