import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

/**
 * Migration: Example write migration - Safe update with conditional check
 * Created: 2025-01-01
 *
 * Purpose: Demonstrates write migration pattern with idempotency
 * Idempotency: Uses always-false condition to demonstrate syntax without actual writes
 *
 * This example migration shows how to perform conditional updates.
 * The condition is intentionally always false to prevent accidental data modification.
 * In real migrations, replace with actual business logic and proper conditions.
 */
export async function up(client: DynamoDBClient): Promise<void> {
  const tableName = process.env.CATEGORIES_TABLE_NAME;

  if (!tableName) {
    throw new Error("CATEGORIES_TABLE_NAME environment variable not set");
  }

  const docClient = DynamoDBDocumentClient.from(client);

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          userId: "user-never-exists",
          id: "category-never-exists",
        },
        UpdateExpression: "SET exampleField = :value",
        ConditionExpression: "attribute_exists(nonExistentAttribute)",
        ExpressionAttributeValues: {
          ":value": "example-value",
        },
      }),
    );

    console.log("Example migration: Update completed");
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      console.log(
        "Example migration: Conditional check failed (expected - this is a safe example)",
      );
    } else {
      throw error;
    }
  }
}
