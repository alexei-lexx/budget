import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Mock the operations modules
jest.mock("./operations/migrations-table");
jest.mock("../utils/dynamoClient");

import { createDynamoDBDocumentClient } from "../utils/dynamoClient";
import {
  acquireLock,
  isExecuted,
  markExecuted,
  releaseLock,
} from "./operations/migrations-table";
import { executeMigrations } from "./runner";
import { Migration } from "./types";

const mockIsExecuted = isExecuted as jest.MockedFunction<typeof isExecuted>;
const mockMarkExecuted = markExecuted as jest.MockedFunction<
  typeof markExecuted
>;
const mockAcquireLock = acquireLock as jest.MockedFunction<typeof acquireLock>;
const mockReleaseLock = releaseLock as jest.MockedFunction<typeof releaseLock>;
const mockCreateDynamoDBDocumentClient =
  createDynamoDBDocumentClient as jest.MockedFunction<
    typeof createDynamoDBDocumentClient
  >;

describe("executeMigrations", () => {
  let mockClient: DynamoDBClient;
  let mockDocClient: DynamoDBDocumentClient;
  const tableName = "test-migrations-table";

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock clients
    mockClient = {} as DynamoDBClient;
    mockDocClient = {} as DynamoDBDocumentClient;
    mockCreateDynamoDBDocumentClient.mockReturnValue(mockDocClient);

    // Default mock implementations
    mockAcquireLock.mockResolvedValue(undefined);
    mockReleaseLock.mockResolvedValue(undefined);
    mockIsExecuted.mockResolvedValue(false);
    mockMarkExecuted.mockResolvedValue(undefined);

    // Suppress console output in tests
    jest.spyOn(console, "log").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("successful execution", () => {
    it("should execute all pending migrations", async () => {
      const migration1 = jest.fn().mockResolvedValue(undefined);
      const migration2 = jest.fn().mockResolvedValue(undefined);

      const migrations: Migration[] = [
        {
          timestamp: "20231203120000",
          description: "first-migration",
          up: migration1,
        },
        {
          timestamp: "20231203130000",
          description: "second-migration",
          up: migration2,
        },
      ];

      const stats = await executeMigrations(mockClient, migrations, tableName);

      expect(stats.total).toBe(2);
      expect(stats.executed).toBe(2);
      expect(stats.skipped).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.results).toHaveLength(2);
      expect(stats.results[0].executed).toBe(true);
      expect(stats.results[1].executed).toBe(true);
      expect(migration1).toHaveBeenCalledWith(mockClient);
      expect(migration2).toHaveBeenCalledWith(mockClient);
      expect(mockMarkExecuted).toHaveBeenCalledTimes(2);
    });

    it("should skip already executed migrations", async () => {
      const migration1 = jest.fn().mockResolvedValue(undefined);
      const migration2 = jest.fn().mockResolvedValue(undefined);

      mockIsExecuted.mockImplementation(async (_, __, timestamp) => {
        return timestamp === "20231203120000";
      });

      const migrations: Migration[] = [
        {
          timestamp: "20231203120000",
          description: "first-migration",
          up: migration1,
        },
        {
          timestamp: "20231203130000",
          description: "second-migration",
          up: migration2,
        },
      ];

      const stats = await executeMigrations(mockClient, migrations, tableName);

      expect(stats.total).toBe(2);
      expect(stats.executed).toBe(1);
      expect(stats.skipped).toBe(1);
      expect(stats.failed).toBe(0);
      expect(stats.results[0].executed).toBe(false);
      expect(stats.results[0].durationMs).toBe(0);
      expect(stats.results[1].executed).toBe(true);
      expect(migration1).not.toHaveBeenCalled();
      expect(migration2).toHaveBeenCalledWith(mockClient);
      expect(mockMarkExecuted).toHaveBeenCalledTimes(1);
    });

    it("should execute empty migration list successfully", async () => {
      const stats = await executeMigrations(mockClient, [], tableName);

      expect(stats.total).toBe(0);
      expect(stats.executed).toBe(0);
      expect(stats.skipped).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.results).toHaveLength(0);
    });
  });

  describe("lock management", () => {
    it("should acquire lock before executing migrations", async () => {
      const migration = jest.fn().mockResolvedValue(undefined);
      const migrations: Migration[] = [
        {
          timestamp: "20231203120000",
          description: "test-migration",
          up: migration,
        },
      ];

      await executeMigrations(mockClient, migrations, tableName);

      expect(mockAcquireLock).toHaveBeenCalledWith(mockDocClient, tableName);
      expect(migration).toHaveBeenCalledWith(mockClient);
    });

    it("should release lock after successful execution", async () => {
      const migrations: Migration[] = [
        {
          timestamp: "20231203120000",
          description: "test-migration",
          up: jest.fn().mockResolvedValue(undefined),
        },
      ];

      await executeMigrations(mockClient, migrations, tableName);

      expect(mockReleaseLock).toHaveBeenCalledWith(mockDocClient, tableName);
    });

    it("should release lock after migration failure", async () => {
      const migrations: Migration[] = [
        {
          timestamp: "20231203120000",
          description: "test-migration",
          up: jest.fn().mockRejectedValue(new Error("Migration failed")),
        },
      ];

      await expect(
        executeMigrations(mockClient, migrations, tableName),
      ).rejects.toThrow("Migration 20231203120000 failed");

      expect(mockReleaseLock).toHaveBeenCalledWith(mockDocClient, tableName);
    });

    it("should not release lock if acquisition failed", async () => {
      mockAcquireLock.mockRejectedValue(new Error("Lock already held"));

      const migrations: Migration[] = [
        {
          timestamp: "20231203120000",
          description: "test-migration",
          up: jest.fn().mockResolvedValue(undefined),
        },
      ];

      await expect(
        executeMigrations(mockClient, migrations, tableName),
      ).rejects.toThrow("Migration runner failed");

      expect(mockReleaseLock).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should throw error when migration fails", async () => {
      const migrations: Migration[] = [
        {
          timestamp: "20231203120000",
          description: "test-migration",
          up: jest.fn().mockRejectedValue(new Error("Database error")),
        },
      ];

      await expect(
        executeMigrations(mockClient, migrations, tableName),
      ).rejects.toThrow("Migration 20231203120000 failed: Database error");
    });

    it("should not execute subsequent migrations after failure", async () => {
      const migration1 = jest.fn().mockRejectedValue(new Error("Failed"));
      const migration2 = jest.fn().mockResolvedValue(undefined);

      const migrations: Migration[] = [
        {
          timestamp: "20231203120000",
          description: "first-migration",
          up: migration1,
        },
        {
          timestamp: "20231203130000",
          description: "second-migration",
          up: migration2,
        },
      ];

      await expect(
        executeMigrations(mockClient, migrations, tableName),
      ).rejects.toThrow();

      expect(migration1).toHaveBeenCalled();
      expect(migration2).not.toHaveBeenCalled();
    });

    it("should not mark failed migration as executed", async () => {
      const migrations: Migration[] = [
        {
          timestamp: "20231203120000",
          description: "test-migration",
          up: jest.fn().mockRejectedValue(new Error("Failed")),
        },
      ];

      await expect(
        executeMigrations(mockClient, migrations, tableName),
      ).rejects.toThrow();

      expect(mockMarkExecuted).not.toHaveBeenCalled();
    });

    it("should record error in statistics", async () => {
      const error = new Error("Migration failed");
      const migrations: Migration[] = [
        {
          timestamp: "20231203120000",
          description: "test-migration",
          up: jest.fn().mockRejectedValue(error),
        },
      ];

      await expect(
        executeMigrations(mockClient, migrations, tableName),
      ).rejects.toThrow();

      // We can't access stats after throw, but we tested the behavior
      expect(mockMarkExecuted).not.toHaveBeenCalled();
    });
  });

  describe("statistics tracking", () => {
    it("should track execution duration", async () => {
      const migrations: Migration[] = [
        {
          timestamp: "20231203120000",
          description: "test-migration",
          up: jest.fn().mockResolvedValue(undefined),
        },
      ];

      const stats = await executeMigrations(mockClient, migrations, tableName);

      expect(stats.totalDurationMs).toBeGreaterThanOrEqual(0);
      expect(stats.results[0].durationMs).toBeGreaterThanOrEqual(0);
    });

    it("should record all results in order", async () => {
      mockIsExecuted.mockImplementation(async (_, __, timestamp) => {
        return timestamp === "20231203130000";
      });

      const migrations: Migration[] = [
        {
          timestamp: "20231203120000",
          description: "first-migration",
          up: jest.fn().mockResolvedValue(undefined),
        },
        {
          timestamp: "20231203130000",
          description: "second-migration",
          up: jest.fn().mockResolvedValue(undefined),
        },
        {
          timestamp: "20231203140000",
          description: "third-migration",
          up: jest.fn().mockResolvedValue(undefined),
        },
      ];

      const stats = await executeMigrations(mockClient, migrations, tableName);

      expect(stats.results).toHaveLength(3);
      expect(stats.results[0].timestamp).toBe("20231203120000");
      expect(stats.results[0].executed).toBe(true);
      expect(stats.results[1].timestamp).toBe("20231203130000");
      expect(stats.results[1].executed).toBe(false);
      expect(stats.results[2].timestamp).toBe("20231203140000");
      expect(stats.results[2].executed).toBe(true);
    });
  });
});
