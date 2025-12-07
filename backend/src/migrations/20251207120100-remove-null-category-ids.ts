import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

/**
 * Migration: Remove null categoryId from transactions
 * Created: 2025-12-07
 *
 * Purpose: Find all transactions with categoryId = NULL and remove the attribute
 * Idempotency: Safe to run multiple times (condition checks prevent redundant updates)
 *
 * This migration scans the Transactions table for records where the categoryId
 * attribute has a DynamoDB NULL value and removes that attribute entirely.
 * Transactions without a categoryId attribute or with UUID values are not affected.
 */
export async function up(client: DynamoDBClient): Promise<void> {
  const tableName = process.env.TRANSACTIONS_TABLE_NAME;

  if (!tableName) {
    throw new Error("TRANSACTIONS_TABLE_NAME environment variable not set");
  }

  const docClient = DynamoDBDocumentClient.from(client);

  let scannedCount = 0;
  let updatedCount = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  console.log(
    "Starting migration: Scanning for transactions with NULL categoryId",
  );

  do {
    // Scan for transactions with NULL categoryId
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "attribute_type(categoryId, :nullType)",
        ExpressionAttributeValues: {
          ":nullType": "NULL",
        },
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );

    const items = scanResult.Items || [];
    scannedCount += items.length;

    console.log(
      `Found ${items.length} transactions with NULL categoryId in this batch`,
    );

    // Update each transaction to remove the categoryId attribute
    for (const item of items) {
      try {
        await docClient.send(
          new UpdateCommand({
            TableName: tableName,
            Key: {
              userId: item.userId,
              id: item.id,
            },
            UpdateExpression: "REMOVE categoryId",
            ConditionExpression: "attribute_type(categoryId, :nullType)",
            ExpressionAttributeValues: {
              ":nullType": "NULL",
            },
          }),
        );
        updatedCount++;
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === "ConditionalCheckFailedException"
        ) {
          // Attribute was already removed or changed by another process (idempotency)
          console.log(
            `Skipping transaction ${item.id} - categoryId already removed or modified`,
          );
        } else {
          throw error;
        }
      }
    }

    lastEvaluatedKey = scanResult.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(
    `Migration completed: Scanned ${scannedCount} transactions, updated ${updatedCount}`,
  );
}
