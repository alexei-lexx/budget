import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

// ============================================================================
// Migration History Operations
// ============================================================================

/**
 * Check if migration has been executed
 *
 * @param client - DynamoDB document client
 * @param tableName - Migration history table name
 * @param timestamp - Migration timestamp
 * @returns True if migration record exists, false otherwise
 */
export async function isExecuted(
  client: DynamoDBDocumentClient,
  tableName: string,
  timestamp: string,
): Promise<boolean> {
  const result = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: { PK: timestamp },
    }),
  );

  return !!result.Item;
}

/**
 * Mark migration as executed
 *
 * Creates a record with PK=timestamp in the history table.
 *
 * @param client - DynamoDB document client
 * @param tableName - Migration history table name
 * @param timestamp - Migration timestamp
 */
export async function markExecuted(
  client: DynamoDBDocumentClient,
  tableName: string,
  timestamp: string,
): Promise<void> {
  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: { PK: timestamp },
    }),
  );
}

/**
 * Get all executed migration timestamps
 *
 * @param client - DynamoDB document client
 * @param tableName - Migration history table name
 * @returns Array of executed migration timestamps (sorted ascending)
 */
export async function getExecutedMigrations(
  client: DynamoDBDocumentClient,
  tableName: string,
): Promise<string[]> {
  const result = await client.send(
    new ScanCommand({
      TableName: tableName,
    }),
  );

  const timestamps = (result.Items || [])
    .filter((item) => item.PK !== "LOCK")
    .map((item) => item.PK)
    .sort();

  return timestamps;
}

// ============================================================================
// Migration Lock Operations
// ============================================================================

/**
 * Acquire migration lock using conditional put
 *
 * Creates a lock record with PK="LOCK" using conditional expression.
 * Fails if lock already exists (concurrent execution).
 *
 * @param client - DynamoDB document client
 * @param tableName - Migration history table name
 * @throws Error if lock already held
 */
export async function acquireLock(
  client: DynamoDBDocumentClient,
  tableName: string,
): Promise<void> {
  try {
    await client.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK: "LOCK",
          acquiredAt: new Date().toISOString(),
        },
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      throw new Error(
        "Migration lock already held. Another migration may be running.",
      );
    }
    throw error;
  }
}

/**
 * Release migration lock
 *
 * Deletes the lock record with PK="LOCK".
 * Does not throw if lock doesn't exist.
 *
 * @param client - DynamoDB document client
 * @param tableName - Migration history table name
 */
export async function releaseLock(
  client: DynamoDBDocumentClient,
  tableName: string,
): Promise<void> {
  await client.send(
    new DeleteCommand({
      TableName: tableName,
      Key: { PK: "LOCK" },
    }),
  );
}

/**
 * Check if lock exists (diagnostic only)
 *
 * @param client - DynamoDB document client
 * @param tableName - Migration history table name
 * @returns True if lock exists, false otherwise
 */
export async function isLocked(
  client: DynamoDBDocumentClient,
  tableName: string,
): Promise<boolean> {
  const result = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: { PK: "LOCK" },
    }),
  );

  return !!result.Item;
}
