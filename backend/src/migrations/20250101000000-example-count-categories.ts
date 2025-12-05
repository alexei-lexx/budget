import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

/**
 * Migration: Example read-only migration - Count categories
 * Created: 2025-01-01
 *
 * Purpose: Demonstrates read-only migration pattern
 * Idempotency: Safe to run multiple times (no writes)
 *
 * This example migration scans the Categories table and counts records.
 * It demonstrates how to safely read data from DynamoDB without modifications.
 */
export async function up(client: DynamoDBClient): Promise<void> {
  const tableName = process.env.CATEGORIES_TABLE_NAME;

  if (!tableName) {
    throw new Error("CATEGORIES_TABLE_NAME environment variable not set");
  }

  const docClient = DynamoDBDocumentClient.from(client);

  const result = await docClient.send(
    new ScanCommand({
      TableName: tableName,
      Select: "COUNT",
    }),
  );

  console.log(
    `Example migration: Found ${result.Count || 0} records in Categories table`,
  );
}
