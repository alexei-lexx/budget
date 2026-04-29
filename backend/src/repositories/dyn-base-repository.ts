import {
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { RepositoryError } from "../ports/repository-error";

export interface QueryResult<TDbItem> {
  items: TDbItem[];
  hasNextPage: boolean;
}

export abstract class DynBaseRepository {
  protected readonly tableName: string;

  constructor(
    tableName: string,
    protected readonly client: DynamoDBDocumentClient,
  ) {
    if (!tableName) {
      throw new RepositoryError("tableName is required", "MISSING_TABLE_NAME");
    }

    this.tableName = tableName;
  }

  /**
   * Unified pagination that handles both paginated and "get all" queries.
   * @param params - Query parameters
   * @param pageSize - Number of items per page (undefined = get all items)
   * @param schema - Zod schema for item hydration
   * @param accumulatedItems - Accumulator for recursive calls
   */
  protected async paginateQuery<TDbItem>({
    params,
    pageSize,
    schema,
    accumulatedItems = [],
  }: {
    params: QueryCommandInput;
    pageSize?: number;
    schema: z.ZodType<TDbItem>;
    accumulatedItems?: TDbItem[];
  }): Promise<QueryResult<TDbItem>> {
    const itemsNeedeCount = pageSize
      ? pageSize - accumulatedItems.length
      : undefined;

    const queryParams = itemsNeedeCount
      ? { ...params, Limit: itemsNeedeCount }
      : params;

    const command = new QueryCommand(queryParams);
    const result = await this.client.send(command);
    const newItems = (result.Items || []).map((item) =>
      this.hydrate(schema, item),
    );

    const newAccumulatedItems = [...accumulatedItems, ...newItems];

    const hasMoreInDb = Boolean(result.LastEvaluatedKey);

    const shouldContinue =
      hasMoreInDb && (!pageSize || newAccumulatedItems.length < pageSize);

    if (shouldContinue) {
      return this.paginateQuery({
        params: {
          ...params,
          ExclusiveStartKey: result.LastEvaluatedKey,
        },
        pageSize,
        schema,
        accumulatedItems: newAccumulatedItems,
      });
    }

    const hasNextPage = pageSize ? hasMoreInDb : false;

    return {
      items: newAccumulatedItems,
      hasNextPage,
    };
  }

  /**
   * Validate and hydrate a database record against a Zod schema.
   */
  protected hydrate<TDbItem>(
    schema: z.ZodType<TDbItem>,
    data: unknown,
  ): TDbItem {
    return schema.parse(data);
  }
}
