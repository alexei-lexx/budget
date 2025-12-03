/**
 * Contract: Migration File Interface
 *
 * This file defines the contract that all migration files must adhere to.
 * Migration files are TypeScript modules that export an async `up` function.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

/**
 * Migration function signature
 *
 * Each migration file MUST export a named function `up` with this signature.
 *
 * @param client - DynamoDB client configured for the target environment
 *                 (local or production)
 * @returns Promise that resolves when migration completes successfully
 * @throws Error if migration fails (will be retried on next run)
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
 * Migration filename format
 *
 * Format: YYYYMMDDHHMMSS-description.ts
 * Example: 20231203120000-backfill-category-icons.ts
 *
 * Rules:
 * - Timestamp must be 14 digits (YYYYMMDDHHMMSS)
 * - Description must be kebab-case
 * - Must end with .ts extension
 */
export const MIGRATION_FILENAME_PATTERN = /^(\d{14})-([a-z0-9-]+)\.ts$/;

/**
 * Environment variables required by migrations
 *
 * These environment variables MUST be available when migrations execute.
 */
export interface MigrationEnvironment {
  /**
   * Name of the migration history DynamoDB table
   * Example: "Migrations"
   */
  MIGRATIONS_TABLE_NAME: string;

  /**
   * Node environment identifier
   * Example: "development", "staging", "production"
   */
  NODE_ENV: string;

  /**
   * DynamoDB endpoint (local development only)
   * Example: "http://localhost:8000"
   */
  DYNAMODB_ENDPOINT?: string;

  /**
   * Application table names (available for migration use)
   * Examples: "Categories", "Transactions", "Accounts"
   */
  CATEGORIES_TABLE_NAME?: string;
  TRANSACTIONS_TABLE_NAME?: string;
  ACCOUNTS_TABLE_NAME?: string;
  // Add other table names as needed
}

/**
 * Example migration file structure
 *
 * File: backend/src/migrations/20231203120000-backfill-category-icons.ts
 */
export const EXAMPLE_MIGRATION = `
import { DynamoDBClient, ScanCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

/**
 * Migration: Add default icon to all categories missing icons
 * Created: 2023-12-03
 *
 * Idempotency: Uses conditional update to skip categories with existing icons
 */
export async function up(client: DynamoDBClient): Promise<void> {
  const tableName = process.env.CATEGORIES_TABLE_NAME;
  if (!tableName) throw new Error("CATEGORIES_TABLE_NAME not set");

  const result = await client.send(new ScanCommand({
    TableName: tableName,
    FilterExpression: "attribute_not_exists(icon)"
  }));

  for (const item of result.Items || []) {
    await client.send(new UpdateItemCommand({
      TableName: tableName,
      Key: { PK: item.PK },
      UpdateExpression: "SET icon = :icon",
      ConditionExpression: "attribute_not_exists(icon)",
      ExpressionAttributeValues: { ":icon": { S: "default" } }
    })).catch(err => {
      if (err.name !== "ConditionalCheckFailedException") throw err;
    });
  }

  console.log(\`Updated \${result.Items?.length || 0} categories\`);
}
`;
