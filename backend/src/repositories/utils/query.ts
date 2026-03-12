import {
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { hydrate } from "./hydrate";

export interface QueryResult<T> {
  items: T[];
  hasNextPage: boolean;
}

/**
 * Unified pagination function that handles both paginated and "get all" queries
 * @param client - DynamoDB Document Client
 * @param params - Query parameters
 * @param pageSize - Number of items per page (undefined = get all items)
 * @param schema - Zod schema for item hydration
 * @param accumulatedItems - Accumulator for recursive calls
 */
export async function paginateQuery<T>({
  client,
  params,
  pageSize,
  schema,
  accumulatedItems = [],
}: {
  client: DynamoDBDocumentClient;
  params: QueryCommandInput;
  pageSize?: number;
  schema: z.ZodType<T>;
  accumulatedItems?: T[];
}): Promise<QueryResult<T>> {
  // Calculate how many more items we need
  const itemsNeedeCount = pageSize
    ? pageSize - accumulatedItems.length
    : undefined;

  // Set DynamoDB Limit to avoid over-fetching
  const queryParams = itemsNeedeCount
    ? { ...params, Limit: itemsNeedeCount }
    : params;

  const command = new QueryCommand(queryParams);
  const result = await client.send(command);
  const newItems = (result.Items || []).map((item) => hydrate(schema, item));

  // Add all returned items to accumulator
  const newAccumulatedItems = [...accumulatedItems, ...newItems];

  // Check if DynamoDB has more data
  const hasMoreInDb = Boolean(result.LastEvaluatedKey);

  // Continue fetching if:
  // 1. No pageSize limit (get all items), OR
  // 2. Haven't reached pageSize yet
  const shouldContinue =
    hasMoreInDb && (!pageSize || newAccumulatedItems.length < pageSize);

  if (shouldContinue) {
    return paginateQuery({
      client,
      params: {
        ...params,
        ExclusiveStartKey: result.LastEvaluatedKey,
      },
      pageSize,
      schema,
      accumulatedItems: newAccumulatedItems,
    });
  }

  // Determine if there's a next page
  const hasNextPage = pageSize ? hasMoreInDb : false;

  return {
    items: newAccumulatedItems,
    hasNextPage,
  };
}
