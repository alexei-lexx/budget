import {
  ConditionalCheckFailedException,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { requireEnv } from "../utils/require-env";

/**
 * Adds `version = 0` to every existing Account row.
 * Idempotent: `attribute_not_exists(version)` guards against re-application.
 * Must run before code that requires `version` on reads is deployed.
 */
export async function up(client: DynamoDBClient): Promise<void> {
  const tableName = requireEnv("ACCOUNTS_TABLE_NAME");
  const docClient = DynamoDBDocumentClient.from(client);

  let scannedCount = 0;
  let updatedCount = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  console.log("Starting migration: backfilling version = 0 on accounts");

  do {
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );

    const items = scanResult.Items ?? [];
    scannedCount += items.length;

    for (const item of items) {
      try {
        await docClient.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { userId: item.userId, id: item.id },
            UpdateExpression: "SET version = :zero",
            ConditionExpression: "attribute_not_exists(version)",
            ExpressionAttributeValues: { ":zero": 0 },
          }),
        );
        updatedCount++;
      } catch (error) {
        if (error instanceof ConditionalCheckFailedException) {
          continue;
        }
        throw error;
      }
    }

    lastEvaluatedKey = scanResult.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(
    `Migration completed: scanned ${scannedCount}, backfilled ${updatedCount}`,
  );
}
