import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

/**
 * Migration: Add excludeFromReports field to all categories
 * Created: 2026-01-19
 *
 * Purpose: Add excludeFromReports: false to all existing categories
 * Idempotency: Safe to run multiple times (condition checks prevent redundant updates)
 *
 * This migration scans the Categories table and adds the excludeFromReports
 * boolean field set to false for all existing categories that don't have it.
 * Categories that already have the field are skipped.
 */
export async function up(client: DynamoDBClient): Promise<void> {
  const tableName = process.env.CATEGORIES_TABLE_NAME;

  if (!tableName) {
    throw new Error("CATEGORIES_TABLE_NAME environment variable not set");
  }

  const docClient = DynamoDBDocumentClient.from(client);

  let scannedCount = 0;
  let updatedCount = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  console.log(
    "Starting migration: Adding excludeFromReports field to categories",
  );

  do {
    // Scan all categories
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );

    const items = scanResult.Items || [];
    scannedCount += items.length;

    console.log(`Processing ${items.length} categories in this batch`);

    // Update each category to add excludeFromReports if missing
    for (const item of items) {
      try {
        await docClient.send(
          new UpdateCommand({
            TableName: tableName,
            Key: {
              userId: item.userId,
              id: item.id,
            },
            UpdateExpression: "SET excludeFromReports = :false",
            ConditionExpression: "attribute_not_exists(excludeFromReports)",
            ExpressionAttributeValues: {
              ":false": false,
            },
          }),
        );
        updatedCount++;
        console.log(`✓ Updated category ${item.id} (${item.name})`);
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === "ConditionalCheckFailedException"
        ) {
          // Attribute already exists (idempotency)
          console.log(
            `Skipping category ${item.id} (${item.name}) - excludeFromReports already exists`,
          );
        } else {
          throw error;
        }
      }
    }

    lastEvaluatedKey = scanResult.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(
    `Migration completed: Scanned ${scannedCount} categories, updated ${updatedCount}`,
  );
}
