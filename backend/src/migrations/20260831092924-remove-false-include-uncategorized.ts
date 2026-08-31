import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

/**
 * Migration: Remove includeUncategorized = false from trend presets
 * Created: 2026-08-31
 *
 * Purpose: TrendPreset.includeUncategorized used to be a required boolean
 * defaulting to false. It is now optional and only ever true when set, so
 * existing records storing false fail schema validation on read. This
 * removes the attribute from any trend preset where it is false.
 * Idempotency: Safe to run multiple times (condition checks prevent redundant updates)
 */
export async function up(client: DynamoDBClient): Promise<void> {
  const tableName = process.env.TREND_PRESETS_TABLE_NAME;

  if (!tableName) {
    throw new Error("TREND_PRESETS_TABLE_NAME environment variable not set");
  }

  const docClient = DynamoDBDocumentClient.from(client);

  let scannedCount = 0;
  let updatedCount = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  console.log(
    "Starting migration: Scanning for trend presets with includeUncategorized = false",
  );

  do {
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "includeUncategorized = :falseValue",
        ExpressionAttributeValues: {
          ":falseValue": false,
        },
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );

    const items = scanResult.Items || [];
    scannedCount += items.length;

    console.log(
      `Found ${items.length} trend presets with includeUncategorized = false in this batch`,
    );

    for (const item of items) {
      try {
        await docClient.send(
          new UpdateCommand({
            TableName: tableName,
            Key: {
              userId: item.userId,
              id: item.id,
            },
            UpdateExpression: "REMOVE includeUncategorized",
            ConditionExpression: "includeUncategorized = :falseValue",
            ExpressionAttributeValues: {
              ":falseValue": false,
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
            `Skipping trend preset ${item.id} - includeUncategorized already removed or modified`,
          );
        } else {
          throw error;
        }
      }
    }

    lastEvaluatedKey = scanResult.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(
    `Migration completed: Scanned ${scannedCount} trend presets, updated ${updatedCount}`,
  );
}
