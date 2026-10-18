import { faker } from "@faker-js/faker";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TrendPreset } from "../models/trend-preset";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import { requireEnv } from "../utils/require-env";
import { truncateTable } from "../utils/test-utils/dynamodb-helpers";
import { fakeCreateTrendPresetInput } from "../utils/test-utils/models/trend-preset-fakes";
import { DynTrendPresetRepository } from "./dyn-trend-preset-repository";

describe("DynTrendPresetRepository", () => {
  let repository: DynTrendPresetRepository;
  const userId = faker.string.uuid();
  const tableName = requireEnv("TREND_PRESETS_TABLE_NAME");
  const client = createDynamoDBDocumentClient();

  beforeAll(async () => {
    repository = new DynTrendPresetRepository(tableName, client);
  });

  beforeEach(async () => {
    // Clean up trend presets table before each test
    await truncateTable(client, tableName, {
      partitionKey: "userId",
      sortKey: "id",
    });
  });

  describe("findManyByUserId", () => {
    // Happy path

    it("does not return trend presets from other users", async () => {
      // Arrange
      const otherUserId = faker.string.uuid();
      await repository.create(
        TrendPreset.create(fakeCreateTrendPresetInput({ userId })),
      );
      await repository.create(
        TrendPreset.create(fakeCreateTrendPresetInput({ userId: otherUserId })),
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

    it("persists trend preset", async () => {
      // Arrange
      const trendPreset = TrendPreset.create(
        fakeCreateTrendPresetInput({ userId }),
      );

      // Act
      const result = await repository.create(trendPreset);

      // Assert
      expect(result).toBeUndefined();

      const stored = await repository.findManyByUserId(userId);
      expect(stored).toHaveLength(1);
      expect(stored[0]?.toData()).toEqual(trendPreset.toData());
    });
  });

  describe("deleteOneById", () => {
    // Happy path

    it("removes trend preset", async () => {
      // Arrange
      const trendPreset = TrendPreset.create(
        fakeCreateTrendPresetInput({ userId }),
      );
      await repository.create(trendPreset);

      // Act
      await repository.deleteOneById({ id: trendPreset.id, userId });

      // Assert
      const stored = await repository.findManyByUserId(userId);
      expect(stored).toEqual([]);
    });

    it("does not remove another user's trend preset", async () => {
      // Arrange
      const otherUserId = faker.string.uuid();
      const trendPreset = TrendPreset.create(
        fakeCreateTrendPresetInput({ userId: otherUserId }),
      );
      await repository.create(trendPreset);

      // Act
      await repository.deleteOneById({ id: trendPreset.id, userId });

      // Assert — row still owned by otherUserId
      const stored = await repository.findManyByUserId(otherUserId);
      expect(stored).toHaveLength(1);
    });

    it("does not throw when trend preset does not exist", async () => {
      // Act & Assert
      await expect(
        repository.deleteOneById({ id: faker.string.uuid(), userId }),
      ).resolves.toBeUndefined();
    });
  });
});
