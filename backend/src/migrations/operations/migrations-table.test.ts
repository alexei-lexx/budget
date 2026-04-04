import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { createDynamoDBDocumentClient } from "../../utils/dynamo-client";
import { truncateTable } from "../../utils/test-utils/dynamodb-helpers";
import {
  acquireLock,
  getExecutedMigrations,
  isExecuted,
  isLocked,
  markExecuted,
  releaseLock,
} from "./migrations-table";

describe("Migrations Table Operations", () => {
  let client: DynamoDBDocumentClient;
  const tableName = process.env.MIGRATIONS_TABLE_NAME || "";

  beforeAll(() => {
    client = createDynamoDBDocumentClient();
  });

  beforeEach(async () => {
    // Clean up the migrations table before each test
    await truncateTable(client, tableName, { partitionKey: "PK" });
  });

  // ==========================================================================
  // Migration History Tests
  // ==========================================================================

  describe("Migration History Operations", () => {
    describe("isExecuted", () => {
      it("should return false when migration has not been executed", async () => {
        const executed = await isExecuted(client, tableName, "20231203120000");
        expect(executed).toBe(false);
      });

      it("should return true when migration has been executed", async () => {
        await markExecuted(client, tableName, "20231203120000");

        const executed = await isExecuted(client, tableName, "20231203120000");
        expect(executed).toBe(true);
      });
    });

    describe("markExecuted", () => {
      it("should create migration history record", async () => {
        await markExecuted(client, tableName, "20231203120000");

        const executed = await isExecuted(client, tableName, "20231203120000");
        expect(executed).toBe(true);
      });

      it("should handle marking the same migration multiple times", async () => {
        await markExecuted(client, tableName, "20231203120000");
        await markExecuted(client, tableName, "20231203120000");

        const executed = await isExecuted(client, tableName, "20231203120000");
        expect(executed).toBe(true);
      });

      it("should create records for multiple migrations", async () => {
        await markExecuted(client, tableName, "20231203120000");
        await markExecuted(client, tableName, "20231203130000");
        await markExecuted(client, tableName, "20231204090000");

        expect(await isExecuted(client, tableName, "20231203120000")).toBe(
          true,
        );
        expect(await isExecuted(client, tableName, "20231203130000")).toBe(
          true,
        );
        expect(await isExecuted(client, tableName, "20231204090000")).toBe(
          true,
        );
      });
    });

    describe("getExecutedMigrations", () => {
      it("should return empty array when no migrations executed", async () => {
        const migrations = await getExecutedMigrations(client, tableName);
        expect(migrations).toEqual([]);
      });

      it("should return all executed migration timestamps", async () => {
        await markExecuted(client, tableName, "20231203120000");
        await markExecuted(client, tableName, "20231203130000");
        await markExecuted(client, tableName, "20231204090000");

        const migrations = await getExecutedMigrations(client, tableName);
        expect(migrations).toHaveLength(3);
        expect(migrations).toContain("20231203120000");
        expect(migrations).toContain("20231203130000");
        expect(migrations).toContain("20231204090000");
      });

      it("should return migrations sorted in ascending order", async () => {
        await markExecuted(client, tableName, "20231204090000");
        await markExecuted(client, tableName, "20231203120000");
        await markExecuted(client, tableName, "20231203130000");

        const migrations = await getExecutedMigrations(client, tableName);
        expect(migrations).toEqual([
          "20231203120000",
          "20231203130000",
          "20231204090000",
        ]);
      });

      it("should not return lock record in migrations list", async () => {
        await client.send(
          new PutCommand({
            TableName: tableName,
            Item: { PK: "LOCK", acquiredAt: new Date().toISOString() },
          }),
        );
        await markExecuted(client, tableName, "20231203120000");

        const migrations = await getExecutedMigrations(client, tableName);
        expect(migrations).toEqual(["20231203120000"]);
        expect(migrations).not.toContain("LOCK");
      });
    });
  });

  // ==========================================================================
  // Migration Lock Tests
  // ==========================================================================

  describe("Migration Lock Operations", () => {
    describe("acquireLock", () => {
      it("should successfully acquire lock when none exists", async () => {
        await expect(acquireLock(client, tableName)).resolves.not.toThrow();

        const locked = await isLocked(client, tableName);
        expect(locked).toBe(true);
      });

      it("should throw error when lock already exists", async () => {
        await acquireLock(client, tableName);

        await expect(acquireLock(client, tableName)).rejects.toThrow(
          "Migration lock already held",
        );
      });
    });

    describe("releaseLock", () => {
      it("should successfully release an existing lock", async () => {
        await acquireLock(client, tableName);
        await releaseLock(client, tableName);

        const locked = await isLocked(client, tableName);
        expect(locked).toBe(false);
      });

      it("should not throw error when releasing non-existent lock", async () => {
        await expect(releaseLock(client, tableName)).resolves.not.toThrow();
      });
    });

    describe("lock lifecycle", () => {
      it("should support acquire-release-acquire cycle", async () => {
        await acquireLock(client, tableName);
        await releaseLock(client, tableName);
        await expect(acquireLock(client, tableName)).resolves.not.toThrow();
      });
    });
  });
});
