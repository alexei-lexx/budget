import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { createDynamoDBDocumentClient } from "../utils/dynamoClient";
import { loadMigrations } from "./operations/loader";
import {
  acquireLock,
  isExecuted,
  markExecuted,
  releaseLock,
} from "./operations/migrations-table";
import { Migration, MigrationResult, RunnerStatistics } from "./types";

/**
 * Migration runner error class
 *
 * Follows the error handling pattern from CategoryRepository
 */
class MigrationRunnerError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = "MigrationRunnerError";
  }
}

/**
 * Execute migrations with lock management
 *
 * Process:
 * 1. Acquire lock (fail if already locked)
 * 2. Query migration history
 * 3. Execute pending migrations in chronological order
 * 4. Update history after each success
 * 5. Release lock
 *
 * @param client - DynamoDB client configured for target environment
 * @param migrations - Array of migrations to execute
 * @param migrationsTableName - Name of the migrations table
 * @returns Statistics about migration execution
 * @throws MigrationRunnerError if lock acquisition fails or any migration fails
 */
export async function executeMigrations(
  client: DynamoDBClient,
  migrations: Migration[],
  migrationsTableName: string,
): Promise<RunnerStatistics> {
  const docClient = createDynamoDBDocumentClient(client);
  const startTime = Date.now();

  console.log("Starting migration runner...");

  const stats: RunnerStatistics = {
    total: migrations.length,
    executed: 0,
    skipped: 0,
    failed: 0,
    totalDurationMs: 0,
    results: [],
  };

  let lockAcquired = false;

  try {
    console.log("Acquiring lock...");
    await acquireLock(docClient, migrationsTableName);
    lockAcquired = true;
    console.log("Lock acquired");

    console.log(`Found ${migrations.length} migration(s)`);
    console.log("Checking migration history...");

    for (const migration of migrations) {
      const migrationStartTime = Date.now();
      const result: MigrationResult = {
        timestamp: migration.timestamp,
        executed: false,
        durationMs: 0,
      };

      try {
        const alreadyExecuted = await isExecuted(
          docClient,
          migrationsTableName,
          migration.timestamp,
        );

        if (alreadyExecuted) {
          console.log(
            `Migration ${migration.timestamp} already executed, skipping`,
          );
          result.executed = false;
          result.durationMs = 0;
          stats.skipped++;
        } else {
          console.log(`Executing migration ${migration.timestamp}...`);

          await migration.up(client);

          const migrationDuration = Date.now() - migrationStartTime;
          result.executed = true;
          result.durationMs = migrationDuration;

          await markExecuted(
            docClient,
            migrationsTableName,
            migration.timestamp,
          );

          console.log(
            `Migration ${migration.timestamp} completed in ${migrationDuration}ms`,
          );
          stats.executed++;
        }
      } catch (error) {
        const migrationDuration = Date.now() - migrationStartTime;
        result.executed = false;
        result.durationMs = migrationDuration;
        result.error = error as Error;
        stats.failed++;

        console.error(
          `Migration ${migration.timestamp} failed after ${migrationDuration}ms:`,
          error,
        );

        stats.results.push(result);

        throw new MigrationRunnerError(
          `Migration ${migration.timestamp} failed: ${(error as Error).message}`,
          "MIGRATION_FAILED",
          error,
        );
      }

      stats.results.push(result);
    }

    stats.totalDurationMs = Date.now() - startTime;

    console.log("\nMigration Summary:");
    console.log(`  Total: ${stats.total}`);
    console.log(`  Executed: ${stats.executed}`);
    console.log(`  Skipped: ${stats.skipped}`);
    console.log(`  Failed: ${stats.failed}`);
    console.log(`  Duration: ${stats.totalDurationMs}ms`);

    return stats;
  } catch (error) {
    if ((error as { name?: string }).name === "MigrationRunnerError") {
      throw error;
    }

    throw new MigrationRunnerError(
      `Migration runner failed: ${(error as Error).message}`,
      "RUNNER_FAILED",
      error,
    );
  } finally {
    if (lockAcquired) {
      console.log("\nReleasing lock...");
      await releaseLock(docClient, migrationsTableName);
      console.log("Lock released");
    }
  }
}

/**
 * Run all pending migrations
 *
 * Process:
 * 1. Validate environment
 * 2. Load all migrations from index.ts
 * 3. Execute migrations via executeMigrations
 *
 * @param client - DynamoDB client configured for target environment
 * @returns Statistics about migration execution
 * @throws MigrationRunnerError if environment is invalid or execution fails
 */
export async function runMigrations(
  client: DynamoDBClient,
): Promise<RunnerStatistics> {
  const migrationsTableName = process.env.MIGRATIONS_TABLE_NAME;

  if (!migrationsTableName) {
    throw new MigrationRunnerError(
      "MIGRATIONS_TABLE_NAME environment variable not set",
      "ENV_VAR_MISSING",
    );
  }

  console.log("Loading migrations...");
  const migrations = loadMigrations();

  return executeMigrations(client, migrations, migrationsTableName);
}
