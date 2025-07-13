/**
 * DynamoDB service limits and constants
 */

/**
 * Maximum number of items that can be included in a single DynamoDB TransactWrite operation
 * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Limits.html#limits-api
 */
export const DYNAMODB_TRANSACT_WRITE_MAX_ITEMS = 25;
