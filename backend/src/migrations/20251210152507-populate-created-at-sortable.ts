import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { monotonicFactory } from "ulidx";

/**
 * Migration: Populate createdAtSortable field for all transactions
 * Created: 2025-12-10
 *
 * Purpose: Add createdAtSortable field (createdAt + "#" + monotonicUlid()) to all existing transactions
 * Idempotency: Safe to run multiple times (skips transactions that already have createdAtSortable)
 *
 * This migration scans the Transactions table and adds the createdAtSortable field
 * to enable deterministic ordering of transactions created at the same timestamp.
 * The field combines the ISO8601 createdAt timestamp with a monotonic ULID.
 */
export async function up(client: DynamoDBClient): Promise<void> {
  const tableName = process.env.TRANSACTIONS_TABLE_NAME;

  if (!tableName) {
    throw new Error("TRANSACTIONS_TABLE_NAME environment variable not set");
  }

  const docClient = DynamoDBDocumentClient.from(client);
  const ulid = monotonicFactory();

  let scannedCount = 0;
  let updatedCount = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  console.log(
    "Starting migration: Populating createdAtSortable for all transactions",
  );

  do {
    // Scan all transactions
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );

    const items = scanResult.Items || [];
    scannedCount += items.length;

    console.log(`Scanned ${items.length} transactions`);

    // Filter items that need createdAtSortable populated (idempotency check)
    const itemsToUpdate = items.filter((item) => !item.createdAtSortable);

    console.log(`Found ${itemsToUpdate.length} transactions to update`);

    for (const item of itemsToUpdate) {
      try {
        await docClient.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { userId: item.userId, id: item.id },
            UpdateExpression: "SET createdAtSortable = :createdAtSortable",
            ExpressionAttributeValues: {
              ":createdAtSortable": `${item.createdAt}#${ulid()}`,
            },
            ConditionExpression: "attribute_not_exists(createdAtSortable)",
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
            `Skipping transaction ${item.id} - createdAtSortable already exists`,
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
