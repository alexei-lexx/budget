import { faker } from "@faker-js/faker";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { StarredTrend } from "../models/starred-trend";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import { requireEnv } from "../utils/require-env";
import { truncateTable } from "../utils/test-utils/dynamodb-helpers";
import { fakeCreateStarredTrendInput } from "../utils/test-utils/models/starred-trend-fakes";
import { DynStarredTrendRepository } from "./dyn-starred-trend-repository";

describe("DynStarredTrendRepository", () => {
  let repository: DynStarredTrendRepository;
  const userId = faker.string.uuid();
  const tableName = requireEnv("STARRED_TRENDS_TABLE_NAME");
  const client = createDynamoDBDocumentClient();

  beforeAll(async () => {
    repository = new DynStarredTrendRepository(tableName, client);
  });

  beforeEach(async () => {
    // Clean up starred trends table before each test
    await truncateTable(client, tableName, {
      partitionKey: "userId",
      sortKey: "id",
    });
  });

  describe("findManyByUserId", () => {
    // Happy path

    it("does not return starred trends from other users", async () => {
      // Arrange
      const otherUserId = faker.string.uuid();
      await repository.create(
        StarredTrend.create(fakeCreateStarredTrendInput({ userId })),
      );
      await repository.create(
        StarredTrend.create(
          fakeCreateStarredTrendInput({ userId: otherUserId }),
        ),
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

  describe("create", () => {
    // Happy path

    it("persists starred trend", async () => {
      // Arrange
      const starredTrend = StarredTrend.create(
        fakeCreateStarredTrendInput({ userId }),
      );

      // Act
      const result = await repository.create(starredTrend);

      // Assert
      expect(result).toBeUndefined();

      const stored = await repository.findManyByUserId(userId);
      expect(stored).toHaveLength(1);
      expect(stored[0]?.toData()).toEqual(starredTrend.toData());
    });
  });

  describe("deleteOneById", () => {
    // Happy path

    it("removes starred trend", async () => {
      // Arrange
      const starredTrend = StarredTrend.create(
        fakeCreateStarredTrendInput({ userId }),
      );
      await repository.create(starredTrend);

      // Act
      await repository.deleteOneById({ id: starredTrend.id, userId });

      // Assert
      const stored = await repository.findManyByUserId(userId);
      expect(stored).toEqual([]);
    });

    it("does not remove another user's starred trend", async () => {
      // Arrange
      const otherUserId = faker.string.uuid();
      const starredTrend = StarredTrend.create(
        fakeCreateStarredTrendInput({ userId: otherUserId }),
      );
      await repository.create(starredTrend);

      // Act
      await repository.deleteOneById({ id: starredTrend.id, userId });

      // Assert — row still owned by otherUserId
      const stored = await repository.findManyByUserId(otherUserId);
      expect(stored).toHaveLength(1);
    });

    it("does not throw when starred trend does not exist", async () => {
      // Act & Assert
      await expect(
        repository.deleteOneById({ id: faker.string.uuid(), userId }),
      ).resolves.toBeUndefined();
    });
  });
});
