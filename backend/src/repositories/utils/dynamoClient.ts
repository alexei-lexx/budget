import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const isLocalEnvironment =
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

/**
 * Maximum number of items that can be included in a single DynamoDB TransactWrite operation
 * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Limits.html#limits-api
 */
export const DYNAMODB_TRANSACT_WRITE_MAX_ITEMS = 25;

export function createDynamoDBClient(): DynamoDBClient {
  return new DynamoDBClient({
    region: process.env.AWS_REGION || "",
    ...(isLocalEnvironment && {
      endpoint: process.env.DYNAMODB_ENDPOINT || "",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    }),
  });
}

/**
 * Creates a DynamoDBDocumentClient instance with environment-aware configuration
 * @param dynamoClient - Optional DynamoDB client for dependency injection (useful for testing)
 * @returns DynamoDBDocumentClient configured for the current environment
 */
export function createDynamoDBDocumentClient(
  dynamoClient?: DynamoDBClient,
): DynamoDBDocumentClient {
  const client = dynamoClient || createDynamoDBClient();

  return DynamoDBDocumentClient.from(client);
}
