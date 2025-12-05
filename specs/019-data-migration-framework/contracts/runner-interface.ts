/**
 * Contract: Migration Runner Interface
 *
 * This file defines the contract for the migration runner module that
 * orchestrates migration execution.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { Migration } from "./migration-interface";

/**
 * Migration execution result
 */
export interface MigrationResult {
  /**
   * Migration timestamp
   */
  timestamp: string;

  /**
   * Whether the migration was executed (true) or skipped (false)
   */
  executed: boolean;

  /**
   * Execution duration in milliseconds (0 if skipped)
   */
  durationMs: number;

  /**
   * Error if migration failed
   */
  error?: Error;
}

/**
 * Migration runner statistics
 */
export interface RunnerStatistics {
  /**
   * Total number of migrations found
   */
  total: number;

  /**
   * Number of migrations executed
   */
  executed: number;

  /**
   * Number of migrations skipped (already completed)
   */
  skipped: number;

  /**
   * Number of migrations failed
   */
  failed: number;

  /**
   * Total execution time in milliseconds
   */
  totalDurationMs: number;

  /**
   * Individual migration results
   */
  results: MigrationResult[];
}

/**
 * Migration runner configuration
 */
export interface RunnerConfig {
  /**
   * DynamoDB client configured for target environment
   */
  client: DynamoDBClient;

  /**
   * Name of the migration history table
   * Default: process.env.MIGRATIONS_TABLE_NAME
   */
  migrationTableName: string;

  /**
   * Whether to enable verbose logging
   * Default: false
   */
  verbose?: boolean;
}

/**
 * Migration runner interface
 *
 * Core function that orchestrates migration execution.
 */
export interface MigrationRunner {
  /**
   * Run all pending migrations
   *
   * Process:
   * 1. Acquire lock (fail if already locked)
   * 2. Load all migrations from index.ts
   * 3. Query migration history
   * 4. Execute pending migrations in chronological order
   * 5. Update history after each success
   * 6. Release lock
   *
   * @param config - Runner configuration
   * @returns Statistics about migration execution
   * @throws Error if lock acquisition fails or any migration fails
   */
  runMigrations(config: RunnerConfig): Promise<RunnerStatistics>;
}

/**
 * Lock operations
 */
export interface LockOperations {
  /**
   * Acquire migration lock
   *
   * Creates a lock record with PK="LOCK" using conditional put.
   * Fails if lock already exists (concurrent execution).
   *
   * @param client - DynamoDB client
   * @param tableName - Migration history table name
   * @throws Error if lock already held
   */
  acquireLock(client: DynamoDBClient, tableName: string): Promise<void>;

  /**
   * Release migration lock
   *
   * Deletes the lock record with PK="LOCK".
   *
   * @param client - DynamoDB client
   * @param tableName - Migration history table name
   */
  releaseLock(client: DynamoDBClient, tableName: string): Promise<void>;

  /**
   * Check if lock exists (diagnostic only)
   *
   * @param client - DynamoDB client
   * @param tableName - Migration history table name
   * @returns True if lock exists, false otherwise
   */
  isLocked(client: DynamoDBClient, tableName: string): Promise<boolean>;
}

/**
 * Migration history operations
 */
export interface HistoryOperations {
  /**
   * Check if migration has been executed
   *
   * @param client - DynamoDB client
   * @param tableName - Migration history table name
   * @param timestamp - Migration timestamp
   * @returns True if migration record exists, false otherwise
   */
  isExecuted(
    client: DynamoDBClient,
    tableName: string,
    timestamp: string
  ): Promise<boolean>;

  /**
   * Mark migration as executed
   *
   * Creates a record with PK=timestamp in the history table.
   *
   * @param client - DynamoDB client
   * @param tableName - Migration history table name
   * @param timestamp - Migration timestamp
   */
  markExecuted(
    client: DynamoDBClient,
    tableName: string,
    timestamp: string
  ): Promise<void>;

  /**
   * Get all executed migration timestamps
   *
   * @param client - DynamoDB client
   * @param tableName - Migration history table name
   * @returns Array of executed migration timestamps (sorted ascending)
   */
  getExecutedMigrations(
    client: DynamoDBClient,
    tableName: string
  ): Promise<string[]>;
}

/**
 * Migration loader operations
 */
export interface LoaderOperations {
  /**
   * Load all migrations from index.ts
   *
   * Reads migrations/index.ts exports and extracts migration metadata.
   * Sorts migrations by timestamp (chronological order).
   *
   * @returns Array of migrations sorted by timestamp
   * @throws Error if any migration has invalid structure
   */
  loadMigrations(): Migration[];

  /**
   * Validate migration module structure
   *
   * Ensures migration exports required `up` function.
   *
   * @param module - Migration module to validate
   * @param timestamp - Migration timestamp (for error messages)
   * @throws Error if module structure is invalid
   */
  validateMigration(module: unknown, timestamp: string): void;
}

/**
 * Expected function signature for runner
 *
 * File: backend/src/migrations/runner.ts
 */
export const RUNNER_SIGNATURE = `
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { RunnerStatistics } from "./types";

/**
 * Run all pending migrations
 *
 * @param client - DynamoDB client configured for target environment
 * @returns Statistics about migration execution
 * @throws Error if lock acquisition fails or any migration fails
 */
export async function runMigrations(
  client: DynamoDBClient
): Promise<RunnerStatistics>;
`;

/**
 * Usage examples
 */
export const USAGE_EXAMPLES = {
  /**
   * Local npm script usage
   * File: backend/src/scripts/migrate.ts
   */
  npmScript: `
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { runMigrations } from "../migrations/runner";

const client = new DynamoDBClient({
  endpoint: process.env.DYNAMODB_ENDPOINT || "http://localhost:8000",
  region: "us-east-1",
  credentials: { accessKeyId: "dummy", secretAccessKey: "dummy" }
});

runMigrations(client)
  .then(stats => {
    console.log(\`Executed: \${stats.executed}, Skipped: \${stats.skipped}\`);
    process.exit(0);
  })
  .catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
`,

  /**
   * Lambda handler usage
   * File: backend/src/lambda/migrate.ts
   */
  lambdaHandler: `
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import { runMigrations } from "../migrations/runner";

const client = new DynamoDBClient({});

export const handler: Handler = async (event, context) => {
  try {
    const stats = await runMigrations(client);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Migrations completed",
        executed: stats.executed,
        skipped: stats.skipped,
        totalDurationMs: stats.totalDurationMs
      })
    };
  } catch (error) {
    console.error("Migration failed:", error);
    throw error; // Fail the Lambda invocation
  }
};
`
};
