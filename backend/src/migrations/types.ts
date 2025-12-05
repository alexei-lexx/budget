import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

/**
 * Migration function signature
 *
 * Each migration file MUST export a named function `up` with this signature.
 */
export type MigrationFunction = (client: DynamoDBClient) => Promise<void>;

/**
 * Migration module structure
 *
 * Each migration file MUST be a TypeScript module that exports the `up` function.
 */
export interface MigrationModule {
  up: MigrationFunction;
}

/**
 * Migration metadata
 *
 * Extracted from the migration filename and module.
 */
export interface Migration {
  /**
   * Timestamp extracted from filename (YYYYMMDDHHMMSS format)
   * Example: "20231203120000"
   */
  timestamp: string;

  /**
   * Human-readable description extracted from filename
   * Example: "backfill-category-icons"
   */
  description: string;

  /**
   * The migration function to execute
   */
  up: MigrationFunction;
}

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
 * Migration history record (DynamoDB)
 */
export interface MigrationHistoryRecord {
  /**
   * Migration timestamp (partition key)
   */
  PK: string;
}

/**
 * Lock record (DynamoDB)
 */
export interface LockRecord {
  /**
   * Always "LOCK" (partition key)
   */
  PK: string;

  /**
   * ISO 8601 timestamp when lock was acquired
   */
  acquiredAt: string;
}
