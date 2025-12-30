import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

/**
 * Migration: Remove auth0UserId attribute from users
 * Created: 2025-12-30
 *
 * Purpose: Find all users with auth0UserId attribute and remove it
 * Idempotency: Safe to run multiple times (condition checks prevent redundant updates)
 *
 * This migration scans the Users table for records where the auth0UserId
 * attribute exists and removes that attribute entirely.
 * Users without an auth0UserId attribute are not affected.
 *
 * Background: The application migrated from Auth0 user ID lookups to email-based
 * user lookups. The auth0UserId attribute and Auth0UserIdIndex GSI are no longer
 * needed and have been removed from the schema and CDK configuration.
 */
export async function up(client: DynamoDBClient): Promise<void> {
  const tableName = process.env.USERS_TABLE_NAME;

  if (!tableName) {
    throw new Error("USERS_TABLE_NAME environment variable not set");
  }

  const docClient = DynamoDBDocumentClient.from(client);

  let scannedCount = 0;
  let updatedCount = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  console.log(
    "Starting migration: Scanning for users with auth0UserId attribute",
  );

  do {
    // Scan for users with auth0UserId attribute
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "attribute_exists(auth0UserId)",
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );

    const items = scanResult.Items || [];
    scannedCount += items.length;

    console.log(
      `Found ${items.length} users with auth0UserId attribute in this batch`,
    );

    // Update each user to remove the auth0UserId attribute
    for (const item of items) {
      try {
        await docClient.send(
          new UpdateCommand({
            TableName: tableName,
            Key: {
              id: item.id,
            },
            UpdateExpression: "REMOVE auth0UserId",
            ConditionExpression: "attribute_exists(auth0UserId)",
          }),
        );
        updatedCount++;
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === "ConditionalCheckFailedException"
        ) {
          // Attribute was already removed by another process (idempotency)
          console.log(`Skipping user ${item.id} - auth0UserId already removed`);
        } else {
          throw error;
        }
      }
    }

    lastEvaluatedKey = scanResult.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(
    `Migration completed: Scanned ${scannedCount} users, updated ${updatedCount}`,
  );
}
