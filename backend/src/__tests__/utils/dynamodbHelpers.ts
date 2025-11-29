import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

/**
 * Truncates a DynamoDB table by scanning all items and deleting them in batches.
 * This is the standard way to "truncate" a DynamoDB table since there's no built-in TRUNCATE operation.
 *
 * @param client - The DynamoDB document client
 * @param tableName - The name of the table to truncate
 * @param keySchema - The partition key and sort key names for the table
 */
export async function truncateTable(
  client: DynamoDBDocumentClient,
  tableName: string,
  keySchema: { partitionKey: string; sortKey?: string },
): Promise<void> {
  try {
    // Scan all items in the table
    const scanResult = await client.send(
      new ScanCommand({
        TableName: tableName,
      }),
    );

    if (!scanResult.Items || scanResult.Items.length === 0) {
      return; // Table is already empty
    }

    // Delete items in batches (DynamoDB batch write limit is 25 items)
    const batchSize = 25;
    for (let i = 0; i < scanResult.Items.length; i += batchSize) {
      const batch = scanResult.Items.slice(i, i + batchSize);
      const deleteRequests = batch.map((item) => {
        const key: Record<string, unknown> = {
          [keySchema.partitionKey]: item[keySchema.partitionKey],
        };

        // Add sort key if it exists
        if (keySchema.sortKey) {
          key[keySchema.sortKey] = item[keySchema.sortKey];
        }

        return {
          DeleteRequest: { Key: key },
        };
      });

      await client.send(
        new BatchWriteCommand({
          RequestItems: {
            [tableName]: deleteRequests,
          },
        }),
      );
    }
  } catch (error) {
    console.error(`Error truncating table ${tableName}:`, error);
    throw new Error(
      `Failed to truncate table ${tableName}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
