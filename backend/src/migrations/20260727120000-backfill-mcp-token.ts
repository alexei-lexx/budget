import { randomUUID } from "crypto";
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
 * Backfills `mcpToken` on every User row.
 * Idempotent: `attribute_not_exists(mcpToken)` guards against re-application.
 * Must run before code that requires `mcpToken` on reads is deployed.
 */

export async function up(client: DynamoDBClient): Promise<void> {
  const usersTable = requireEnv("USERS_TABLE_NAME");
  const docClient = DynamoDBDocumentClient.from(client);

  let scannedUsers = 0;
  let backfilledUsers = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  console.log("Starting migration: backfilling mcpToken on users");

  do {
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: usersTable,
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );

    const users = scanResult.Items ?? [];
    scannedUsers += users.length;

    for (const user of users) {
      try {
        await docClient.send(
          new UpdateCommand({
            TableName: usersTable,
            Key: { id: user.id },
            UpdateExpression: "SET mcpToken = :mcpToken",
            ConditionExpression: "attribute_not_exists(mcpToken)",
            ExpressionAttributeValues: {
              ":mcpToken": randomUUID(),
            },
          }),
        );
        backfilledUsers++;
      } catch (error) {
        if (error instanceof ConditionalCheckFailedException) continue;
        throw error;
      }
    }

    lastEvaluatedKey = scanResult.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(
    `Migration completed: scanned ${scannedUsers} users, backfilled ${backfilledUsers}`,
  );
}
