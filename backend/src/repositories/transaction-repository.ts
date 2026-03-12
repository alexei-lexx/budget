import { randomUUID } from "crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { monotonicFactory } from "ulidx";
import { z } from "zod";
import {
  CreateTransactionInput,
  ITransactionRepository,
  Transaction,
  TransactionConnection,
  TransactionEdge,
  TransactionFilterInput,
  TransactionPattern,
  TransactionPatternType,
  TransactionType,
  UpdateTransactionInput,
} from "../models/transaction";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
  PageInfo,
  PaginationInput,
} from "../types/pagination";
import { formatDateAsYYYYMMDD } from "../utils/date";
import {
  DYNAMODB_TRANSACT_WRITE_MAX_ITEMS,
  createDynamoDBDocumentClient,
} from "../utils/dynamo-client";
import {
  TransactionDbItem,
  transactionDbItemSchema,
  transactionSchema,
} from "./schemas/transaction";
import { hydrate } from "./utils/hydrate";
import { paginateQuery } from "./utils/query";

/**
 * Monotonic ULID factory for generating sortable identifiers
 */
const ulid = monotonicFactory();

/**
 * DynamoDB Global Secondary Index names for Transactions table
 */
const USER_DATE_INDEX = "UserDateIndex";
const USER_CREATED_AT_SORTABLE_INDEX = "UserCreatedAtSortableIndex";

/**
 * Sort key names for indexes
 */
const SORT_KEY_DATE = "date";
const SORT_KEY_CREATED_AT_SORTABLE = "createdAtSortable";

/**
 * Repository error class for better error handling
 */
class TransactionRepositoryError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = "TransactionRepositoryError";
  }
}

/**
 * Cursor structure for pagination
 */
interface CursorData {
  createdAtSortable: string; // ISO8601#ULID format for UserCreatedAtSortableIndex
  date: string; // YYYY-MM-DD format for UserDateIndex
  id: string; // UUID
}

/**
 * Zod schema for cursor validation
 */
const cursorDataSchema = z.object({
  createdAtSortable: z.string(),
  date: z.string(),
  id: z.string(),
});

/**
 * Query parameters for transaction filtering
 */
interface TransactionQueryParams {
  indexName: string;
  sortKeyName: string;
  keyConditionExpression: string;
  filterExpression: string;
  expressionAttributeNames: Record<string, string>;
  expressionAttributeValues: Record<string, unknown>;
}

/**
 * Cursor utilities for pagination
 */
function encodeCursor(dbItem: TransactionDbItem): string {
  const cursorData: CursorData = {
    createdAtSortable: dbItem.createdAtSortable,
    date: dbItem.date,
    id: dbItem.id,
  };
  return Buffer.from(JSON.stringify(cursorData)).toString("base64");
}

function decodeCursor(cursor: string): CursorData {
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    const cursorData = cursorDataSchema.parse(parsed);
    return cursorData;
  } catch (error) {
    throw new TransactionRepositoryError(
      "Invalid cursor format",
      "INVALID_CURSOR",
      error,
    );
  }
}

/**
 * Transform TransactionDbItem to Transaction by omitting createdAtSortable
 */
function toTransaction(dbItem: TransactionDbItem): Transaction {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { createdAtSortable, ...transaction } = dbItem;
  return transaction;
}

function buildCreatedAtSortable(transaction: Transaction): string {
  return `${transaction.createdAt}#${ulid()}`;
}

export class TransactionRepository implements ITransactionRepository {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor(dynamoClient?: DynamoDBClient) {
    this.client = createDynamoDBDocumentClient(dynamoClient);
    this.tableName = process.env.TRANSACTIONS_TABLE_NAME || "";

    if (!this.tableName) {
      throw new TransactionRepositoryError(
        "TRANSACTIONS_TABLE_NAME environment variable is required",
        "MISSING_TABLE_NAME",
      );
    }
  }

  async create(input: CreateTransactionInput): Promise<Transaction> {
    const now = new Date().toISOString();
    const transaction = this.buildTransaction(input, now);

    try {
      const dbItem = {
        ...transaction,
        createdAtSortable: buildCreatedAtSortable(transaction),
      };

      const command = new PutCommand({
        TableName: this.tableName,
        Item: dbItem,
      });

      await this.client.send(command);
      return transaction;
    } catch (error) {
      console.error("Error creating transaction:", error);
      throw new TransactionRepositoryError(
        "Failed to create transaction",
        "CREATE_FAILED",
        error,
      );
    }
  }

  async createMany(inputs: CreateTransactionInput[]): Promise<Transaction[]> {
    if (!inputs.length) {
      throw new TransactionRepositoryError(
        "At least one transaction input is required",
        "INVALID_PARAMETERS",
      );
    }

    if (inputs.length > DYNAMODB_TRANSACT_WRITE_MAX_ITEMS) {
      throw new TransactionRepositoryError(
        `DynamoDB transactions support a maximum of ${DYNAMODB_TRANSACT_WRITE_MAX_ITEMS} items`,
        "TOO_MANY_ITEMS",
      );
    }

    const now = new Date().toISOString();
    const transactions = inputs.map((input) =>
      this.buildTransaction(input, now),
    );

    try {
      const transactItems = transactions.map((transaction) => ({
        Put: {
          TableName: this.tableName,
          Item: {
            ...transaction,
            createdAtSortable: buildCreatedAtSortable(transaction),
          },
        },
      }));

      const command = new TransactWriteCommand({
        TransactItems: transactItems,
      });

      await this.client.send(command);
      return transactions;
    } catch (error) {
      console.error("Error creating transactions atomically:", error);
      throw new TransactionRepositoryError(
        "Failed to create transactions atomically",
        "TRANSACT_WRITE_FAILED",
        error,
      );
    }
  }

  async update(
    id: string,
    userId: string,
    input: UpdateTransactionInput,
  ): Promise<Transaction> {
    if (!id || !userId) {
      throw new TransactionRepositoryError(
        "Transaction ID and User ID are required",
        "INVALID_PARAMETERS",
      );
    }

    const now = new Date().toISOString();
    const updateParams = this.buildUpdateParams(input, now, userId, id);

    try {
      const command = new UpdateCommand(updateParams);

      const result = await this.client.send(command);
      return hydrate(transactionSchema, result.Attributes);
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        throw new TransactionRepositoryError(
          "Transaction not found or is archived",
          "NOT_FOUND",
        );
      }

      throw new TransactionRepositoryError(
        "Failed to update transaction",
        "UPDATE_FAILED",
        error,
      );
    }
  }

  async updateMany(
    updates: { id: string; input: UpdateTransactionInput }[],
    userId: string,
  ): Promise<void> {
    if (!updates.length) {
      throw new TransactionRepositoryError(
        "At least one transaction update is required",
        "INVALID_PARAMETERS",
      );
    }

    if (updates.length > DYNAMODB_TRANSACT_WRITE_MAX_ITEMS) {
      throw new TransactionRepositoryError(
        `DynamoDB transactions support a maximum of ${DYNAMODB_TRANSACT_WRITE_MAX_ITEMS} items`,
        "TOO_MANY_ITEMS",
      );
    }

    if (!userId) {
      throw new TransactionRepositoryError(
        "User ID is required",
        "INVALID_PARAMETERS",
      );
    }

    const now = new Date().toISOString();

    try {
      const transactItems = updates.map(({ id, input }) => {
        const updateParams = this.buildUpdateParams(input, now, userId, id);

        return {
          Update: updateParams,
        };
      });

      const command = new TransactWriteCommand({
        TransactItems: transactItems,
      });

      await this.client.send(command);
    } catch (error) {
      console.error("Error updating transactions atomically:", error);

      if (
        error instanceof Error &&
        error.name === "TransactionCanceledException"
      ) {
        throw new TransactionRepositoryError(
          "One or more transactions not found or already archived",
          "NOT_FOUND",
        );
      }

      throw new TransactionRepositoryError(
        "Failed to update transactions atomically",
        "UPDATE_MANY_FAILED",
        error,
      );
    }
  }

  async archive(id: string, userId: string): Promise<Transaction> {
    if (!id || !userId) {
      throw new TransactionRepositoryError(
        "Transaction ID and User ID are required",
        "INVALID_PARAMETERS",
      );
    }

    const now = new Date().toISOString();

    try {
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { userId, id },
        UpdateExpression:
          "SET isArchived = :isArchived, updatedAt = :updatedAt",
        ConditionExpression:
          "attribute_exists(userId) AND attribute_exists(id) AND isArchived <> :isArchived",
        ExpressionAttributeValues: {
          ":isArchived": true,
          ":updatedAt": now,
        },
        ReturnValues: "ALL_NEW",
      });

      const result = await this.client.send(command);
      return hydrate(transactionSchema, result.Attributes);
    } catch (error) {
      console.error("Error archiving transaction:", error);

      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        throw new TransactionRepositoryError(
          "Transaction not found or already archived",
          "NOT_FOUND",
        );
      }

      throw new TransactionRepositoryError(
        "Failed to archive transaction",
        "ARCHIVE_FAILED",
        error,
      );
    }
  }

  async archiveMany(ids: string[], userId: string): Promise<void> {
    if (!ids.length) {
      throw new TransactionRepositoryError(
        "At least one transaction ID is required",
        "INVALID_PARAMETERS",
      );
    }

    if (ids.length > DYNAMODB_TRANSACT_WRITE_MAX_ITEMS) {
      throw new TransactionRepositoryError(
        `DynamoDB transactions support a maximum of ${DYNAMODB_TRANSACT_WRITE_MAX_ITEMS} items`,
        "TOO_MANY_ITEMS",
      );
    }

    if (!userId) {
      throw new TransactionRepositoryError(
        "User ID is required",
        "INVALID_PARAMETERS",
      );
    }

    const now = new Date().toISOString();

    try {
      const transactItems = ids.map((id) => ({
        Update: {
          TableName: this.tableName,
          Key: { userId, id },
          UpdateExpression:
            "SET isArchived = :isArchived, updatedAt = :updatedAt",
          ConditionExpression:
            "attribute_exists(userId) AND attribute_exists(id) AND isArchived <> :isArchived",
          ExpressionAttributeValues: {
            ":isArchived": true,
            ":updatedAt": now,
          },
        },
      }));

      const command = new TransactWriteCommand({
        TransactItems: transactItems,
      });

      await this.client.send(command);
    } catch (error) {
      console.error("Error archiving transactions atomically:", error);

      if (
        error instanceof Error &&
        error.name === "TransactionCanceledException"
      ) {
        throw new TransactionRepositoryError(
          "One or more transactions not found or already archived",
          "NOT_FOUND",
        );
      }

      throw new TransactionRepositoryError(
        "Failed to archive transactions atomically",
        "ARCHIVE_MANY_FAILED",
        error,
      );
    }
  }

  async findActiveByUserId(
    userId: string,
    pagination?: PaginationInput,
    filters?: TransactionFilterInput,
  ): Promise<TransactionConnection> {
    if (!userId) {
      throw new TransactionRepositoryError(
        "User ID is required",
        "INVALID_USER_ID",
      );
    }

    // Default pagination values
    const first = pagination?.first || DEFAULT_PAGE_SIZE;
    const after = pagination?.after;

    // Validate pagination parameters
    if (first < MIN_PAGE_SIZE || first > MAX_PAGE_SIZE) {
      throw new TransactionRepositoryError(
        `First parameter must be between ${MIN_PAGE_SIZE} and ${MAX_PAGE_SIZE}`,
        "INVALID_PAGINATION",
      );
    }

    try {
      // Build query parameters (index selection, key condition, filters)
      const queryParams = this.buildQueryParams(userId, filters);

      // Decode cursor once if provided
      const decodedAfter = after ? decodeCursor(after) : null;

      // Execute query
      const { items: dbItems, hasNextPage } =
        await paginateQuery<TransactionDbItem>({
          client: this.client,
          params: {
            TableName: this.tableName,
            IndexName: queryParams.indexName,
            KeyConditionExpression: queryParams.keyConditionExpression,
            FilterExpression: queryParams.filterExpression,
            ...(Object.keys(queryParams.expressionAttributeNames).length >
              0 && {
              ExpressionAttributeNames: queryParams.expressionAttributeNames,
            }),
            ExpressionAttributeValues: queryParams.expressionAttributeValues,
            ScanIndexForward: false, // Descending order (newest first)
            ...(decodedAfter && {
              ExclusiveStartKey: {
                userId: userId,
                id: decodedAfter.id,
                [queryParams.sortKeyName]:
                  queryParams.sortKeyName === SORT_KEY_DATE
                    ? decodedAfter.date
                    : decodedAfter.createdAtSortable,
              },
            }),
          },
          pageSize: first,
          schema: transactionDbItemSchema,
        });

      // Create edges with cursors
      const edges: TransactionEdge[] = dbItems.map((dbItem) => ({
        node: toTransaction(dbItem),
        cursor: encodeCursor(dbItem),
      }));

      // Build page info
      const pageInfo: PageInfo = {
        hasNextPage,
        hasPreviousPage: !!after, // Has previous page if we have an after cursor
        startCursor: edges.length > 0 ? edges[0].cursor : undefined,
        endCursor:
          edges.length > 0 ? edges[edges.length - 1].cursor : undefined,
      };

      // Get total count (this is a separate query for accuracy)
      const totalCount = await this.countActiveTransactions(queryParams);

      return {
        edges,
        pageInfo,
        totalCount,
      };
    } catch (error) {
      if (error instanceof TransactionRepositoryError) {
        throw error;
      }

      console.error("Error finding paginated transactions:", error);
      throw new TransactionRepositoryError(
        "Failed to find paginated transactions",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async findActiveById(
    id: string,
    userId: string,
  ): Promise<Transaction | null> {
    if (!id || !userId) {
      throw new TransactionRepositoryError(
        "Transaction ID and User ID are required",
        "INVALID_PARAMETERS",
      );
    }

    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { userId, id },
      });

      const result = await this.client.send(command);

      if (!result.Item) {
        return null;
      }

      const transaction = hydrate(transactionSchema, result.Item);

      // Return null if transaction is archived (soft deleted)
      if (transaction.isArchived) {
        return null;
      }

      return transaction;
    } catch (error) {
      console.error("Error finding transaction by ID:", error);
      throw new TransactionRepositoryError(
        "Failed to find transaction",
        "GET_FAILED",
        error,
      );
    }
  }

  async findActiveByAccountId(
    accountId: string,
    userId: string,
  ): Promise<Transaction[]> {
    if (!accountId || !userId) {
      throw new TransactionRepositoryError(
        "Account ID and User ID are required",
        "INVALID_PARAMETERS",
      );
    }

    try {
      const { items } = await paginateQuery<Transaction>({
        client: this.client,
        params: {
          TableName: this.tableName,
          KeyConditionExpression: "userId = :userId",
          FilterExpression:
            "accountId = :accountId AND isArchived = :isArchived",
          ExpressionAttributeValues: {
            ":userId": userId,
            ":accountId": accountId,
            ":isArchived": false,
          },
        },
        pageSize: undefined, // No pageSize = get all items
        schema: transactionSchema,
      });

      return items;
    } catch (error) {
      console.error("Error finding transactions by account ID:", error);
      throw new TransactionRepositoryError(
        "Failed to find transactions by account",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async findActiveByTransferId(
    transferId: string,
    userId: string,
  ): Promise<Transaction[]> {
    if (!transferId || !userId) {
      throw new TransactionRepositoryError(
        "Transfer ID and User ID are required",
        "INVALID_PARAMETERS",
      );
    }

    try {
      const { items } = await paginateQuery<Transaction>({
        client: this.client,
        params: {
          TableName: this.tableName,
          KeyConditionExpression: "userId = :userId",
          FilterExpression:
            "transferId = :transferId AND isArchived = :isArchived",
          ExpressionAttributeValues: {
            ":userId": userId,
            ":transferId": transferId,
            ":isArchived": false,
          },
        },
        pageSize: undefined, // No pageSize = get all items
        schema: transactionSchema,
      });

      return items;
    } catch (error) {
      console.error("Error finding transactions by transfer ID:", error);
      throw new TransactionRepositoryError(
        "Failed to find transactions by transfer",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async findActiveByMonthAndTypes(
    userId: string,
    year: number,
    month: number,
    types: TransactionType[],
  ): Promise<Transaction[]> {
    if (!userId) {
      throw new TransactionRepositoryError(
        "User ID is required",
        "INVALID_PARAMETERS",
      );
    }

    if (types.length === 0) {
      throw new TransactionRepositoryError(
        "At least one transaction type is required",
        "INVALID_PARAMETERS",
      );
    }

    if (!Number.isInteger(year) || year <= 0) {
      throw new TransactionRepositoryError(
        "Year must be a positive integer",
        "INVALID_PARAMETERS",
      );
    }

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new TransactionRepositoryError(
        "Month must be a valid integer between 1 and 12",
        "INVALID_PARAMETERS",
      );
    }

    // Calculate start and end dates for the month using Date class
    const startOfMonth = new Date(year, month - 1, 1); // month is 0-indexed in Date constructor
    const endOfMonth = new Date(year, month, 0); // day=0 gives last day of previous month

    const startDate = formatDateAsYYYYMMDD(startOfMonth);
    const endDate = formatDateAsYYYYMMDD(endOfMonth);

    // Build type filter expression with OR conditions
    // For single type: "#type = :type0"
    // For multiple types: "(#type = :type0 OR #type = :type1 OR #type = :type2)"
    const typeConditions = types
      .map((_, index) => `#type = :type${index}`)
      .join(" OR ");
    const typeFilterExpression =
      types.length > 1 ? `(${typeConditions})` : typeConditions;

    // Build expression attribute values for types
    const typeAttributeValues: Record<string, TransactionType> = {};
    types.forEach((type, index) => {
      typeAttributeValues[`:type${index}`] = type;
    });

    try {
      const { items } = await paginateQuery<Transaction>({
        client: this.client,
        params: {
          TableName: this.tableName,
          IndexName: USER_DATE_INDEX,
          KeyConditionExpression:
            "userId = :userId AND #date BETWEEN :startDate AND :endDate",
          FilterExpression: `${typeFilterExpression} AND isArchived = :isArchived`,
          ExpressionAttributeNames: {
            "#date": "date",
            "#type": "type",
          },
          ExpressionAttributeValues: {
            ":userId": userId,
            ":startDate": startDate,
            ":endDate": endDate,
            ":isArchived": false,
            ...typeAttributeValues,
          },
          ScanIndexForward: true, // Sort by date ascending
        },
        pageSize: undefined, // No pageSize = get all items
        schema: transactionSchema,
      });

      return items;
    } catch (error) {
      console.error("Error finding transactions by month and types:", error);
      throw new TransactionRepositoryError(
        "Failed to find transactions by month and types",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async findActiveByDescription(
    userId: string,
    searchText: string,
    limit: number,
  ): Promise<Transaction[]> {
    if (!userId) {
      throw new TransactionRepositoryError(
        "User ID is required",
        "INVALID_PARAMETERS",
      );
    }

    if (!Number.isInteger(limit) || limit <= 0) {
      throw new TransactionRepositoryError(
        "Limit must be a positive integer",
        "INVALID_PARAMETERS",
      );
    }

    // No-op optimization for empty search text
    if (!searchText) {
      return [];
    }

    try {
      // Query recent transactions by user, ordered by creation time (newest first)
      // Use DynamoDB's native contains() function for efficient server-side filtering
      const { items: transactions } = await paginateQuery<Transaction>({
        client: this.client,
        params: {
          TableName: this.tableName,
          IndexName: USER_CREATED_AT_SORTABLE_INDEX,
          KeyConditionExpression: "userId = :userId",
          FilterExpression:
            "isArchived = :isArchived AND contains(description, :searchText)",
          ExpressionAttributeValues: {
            ":userId": userId,
            ":isArchived": false,
            ":searchText": searchText,
          },
          ScanIndexForward: false, // Newest first (descending createdAtSortable order)
        },
        pageSize: limit,
        schema: transactionSchema,
      });

      return transactions;
    } catch (error) {
      console.error("Error searching transactions by description:", error);
      throw new TransactionRepositoryError(
        "Failed to search transactions by description",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async hasTransactionsForAccount(
    accountId: string,
    userId: string,
  ): Promise<boolean> {
    if (!accountId || !userId) {
      throw new TransactionRepositoryError(
        "Account ID and User ID are required",
        "INVALID_PARAMETERS",
      );
    }

    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "userId = :userId",
        FilterExpression: "accountId = :accountId AND isArchived = :isArchived",
        ExpressionAttributeValues: {
          ":userId": userId,
          ":accountId": accountId,
          ":isArchived": false,
        },
        Select: "COUNT",
      });

      const result = await this.client.send(command);
      return (result.Count || 0) > 0;
    } catch (error) {
      console.error("Error checking transactions for account:", error);
      throw new TransactionRepositoryError(
        "Failed to check transactions for account",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async detectPatterns(
    userId: string,
    type: TransactionPatternType,
    limit: number,
    sampleSize: number,
  ): Promise<TransactionPattern[]> {
    if (!userId) {
      throw new TransactionRepositoryError(
        "User ID is required",
        "INVALID_PARAMETERS",
      );
    }

    if (!Number.isInteger(limit) || limit <= 0) {
      throw new TransactionRepositoryError(
        "Limit must be a positive integer",
        "INVALID_PARAMETERS",
      );
    }

    if (!Number.isInteger(sampleSize) || sampleSize <= 0) {
      throw new TransactionRepositoryError(
        "Sample size must be a positive integer",
        "INVALID_PARAMETERS",
      );
    }

    try {
      // Query up to sampleSize transactions of the specified type, ordered by creation time (newest first)
      const { items: transactions } = await paginateQuery<Transaction>({
        client: this.client,
        params: {
          TableName: this.tableName,
          IndexName: USER_CREATED_AT_SORTABLE_INDEX,
          KeyConditionExpression: "userId = :userId",
          FilterExpression: "#type = :type AND isArchived = :isArchived",
          ExpressionAttributeNames: {
            "#type": "type",
          },
          ExpressionAttributeValues: {
            ":userId": userId,
            ":type": type,
            ":isArchived": false,
          },
          ScanIndexForward: false, // Newest first
        },
        pageSize: sampleSize, // Limit to sampleSize transactions
        schema: transactionSchema,
      });

      // Filter transactions that have both accountId and categoryId
      const transactionsWithCategory = transactions.filter(
        (transaction) => transaction.accountId && transaction.categoryId,
      );

      // Group by account+category combination and count occurrences
      const patternCounts = new Map<
        string,
        { accountId: string; categoryId: string; usageCount: number }
      >();

      for (const transaction of transactionsWithCategory) {
        const key = `${transaction.accountId}:${transaction.categoryId}`;
        const existing = patternCounts.get(key);

        if (existing) {
          existing.usageCount++;
        } else {
          patternCounts.set(key, {
            accountId: transaction.accountId,
            categoryId: transaction.categoryId as string, // Already filtered for non-null categoryId
            usageCount: 1,
          });
        }
      }

      // Convert to array, sort by usage count (descending), and return top N patterns without exposing count
      const patterns = Array.from(patternCounts.values())
        .sort((a, b) => {
          // Sort by usage count descending
          if (b.usageCount !== a.usageCount) {
            return b.usageCount - a.usageCount;
          }
          // Tie-breaker: sort by accountId then categoryId for deterministic results
          if (a.accountId !== b.accountId) {
            return a.accountId.localeCompare(b.accountId);
          }
          return a.categoryId.localeCompare(b.categoryId);
        })
        .slice(0, limit) // Return top N patterns based on limit parameter
        .map((pattern) => ({
          accountId: pattern.accountId,
          categoryId: pattern.categoryId,
        })); // Strip out usageCount from returned patterns

      return patterns;
    } catch (error) {
      if (error instanceof TransactionRepositoryError) {
        throw error;
      }

      console.error("Error getting account category patterns:", error);
      throw new TransactionRepositoryError(
        "Failed to get account category patterns",
        "QUERY_FAILED",
        error,
      );
    }
  }

  /**
   * Build query parameters for transaction filtering
   * Returns index name, key condition, filter expression, and merged attribute names/values
   */
  private buildQueryParams(
    userId: string,
    filters?: TransactionFilterInput,
  ): TransactionQueryParams {
    // Select index: use UserDateIndex when date filters present, else UserCreatedAtSortableIndex
    const useUserDateIndex = !!(filters?.dateAfter || filters?.dateBefore);
    const indexName = useUserDateIndex
      ? USER_DATE_INDEX
      : USER_CREATED_AT_SORTABLE_INDEX;
    const sortKeyName = useUserDateIndex
      ? SORT_KEY_DATE
      : SORT_KEY_CREATED_AT_SORTABLE;

    // Build key condition expression
    let keyConditionExpression = "userId = :userId";
    const keyAttributeValues: Record<string, unknown> = { ":userId": userId };
    const keyAttributeNames: Record<string, string> = {};

    // Add date range to key condition if using UserDateIndex
    if (useUserDateIndex) {
      if (filters?.dateAfter && filters.dateBefore) {
        keyConditionExpression +=
          " AND #date BETWEEN :dateAfter AND :dateBefore";
        keyAttributeValues[":dateAfter"] = filters.dateAfter;
        keyAttributeValues[":dateBefore"] = filters.dateBefore;
        keyAttributeNames["#date"] = "date";
      } else if (filters?.dateAfter) {
        keyConditionExpression += " AND #date >= :dateAfter";
        keyAttributeValues[":dateAfter"] = filters.dateAfter;
        keyAttributeNames["#date"] = "date";
      } else if (filters?.dateBefore) {
        keyConditionExpression += " AND #date <= :dateBefore";
        keyAttributeValues[":dateBefore"] = filters.dateBefore;
        keyAttributeNames["#date"] = "date";
      }
    }

    // Build filter expression conditions
    const filterConditions: string[] = ["isArchived = :isArchived"];
    const filterAttributeNames: Record<string, string> = {};
    const filterAttributeValues: Record<string, unknown> = {
      ":isArchived": false,
    };

    // Account filter (IN condition for multi-select)
    if (filters?.accountIds && filters.accountIds.length > 0) {
      const placeholders = filters.accountIds
        .map((_: string, index: number) => `:accountId${index}`)
        .join(", ");
      filterConditions.push(`accountId IN (${placeholders})`);
      filters.accountIds.forEach((id: string, index: number) => {
        filterAttributeValues[`:accountId${index}`] = id;
      });
    }

    // Category filter (IN condition + optional uncategorized)
    if (filters?.categoryIds && filters.categoryIds.length > 0) {
      const placeholders = filters.categoryIds
        .map((_: string, index: number) => `:categoryId${index}`)
        .join(", ");
      const categoryCondition = `categoryId IN (${placeholders})`;

      if (filters.includeUncategorized) {
        // Include categories OR uncategorized (handles both undefined and null)
        filterConditions.push(
          `(${categoryCondition} OR attribute_not_exists(categoryId) OR categoryId = :nullCategory)`,
        );
        filterAttributeValues[":nullCategory"] = null;
      } else {
        filterConditions.push(categoryCondition);
      }

      filters.categoryIds.forEach((id: string, index: number) => {
        filterAttributeValues[`:categoryId${index}`] = id;
      });
    } else if (filters?.includeUncategorized) {
      // Only uncategorized (no specific categories selected)
      // Handles both cases: attribute missing (undefined) or explicitly null
      filterConditions.push(
        "(attribute_not_exists(categoryId) OR categoryId = :nullCategory)",
      );
      filterAttributeValues[":nullCategory"] = null;
    }

    // Type filter (IN condition for multi-select)
    if (filters?.types && filters.types.length > 0) {
      filterAttributeNames["#type"] = "type"; // Reserved word, use attribute name
      const placeholders = filters.types
        .map((_: TransactionType, index: number) => `:type${index}`)
        .join(", ");
      filterConditions.push(`#type IN (${placeholders})`);
      filters.types.forEach((type: TransactionType, index: number) => {
        filterAttributeValues[`:type${index}`] = type;
      });
    }

    // Merge attribute names and values from key condition and filter expression
    const expressionAttributeNames = {
      ...keyAttributeNames,
      ...filterAttributeNames,
    };
    const expressionAttributeValues = {
      ...keyAttributeValues,
      ...filterAttributeValues,
    };

    return {
      indexName,
      sortKeyName,
      keyConditionExpression,
      filterExpression: filterConditions.join(" AND "),
      expressionAttributeNames,
      expressionAttributeValues,
    };
  }

  private buildTransaction(
    input: CreateTransactionInput,
    timestamp: string,
  ): Transaction {
    return {
      id: randomUUID(),
      userId: input.userId,
      accountId: input.accountId,
      categoryId: input.categoryId || undefined,
      type: input.type,
      amount: input.amount,
      currency: input.currency,
      date: input.date,
      description: input.description || undefined,
      transferId: input.transferId || undefined,
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  private buildUpdateParams(
    input: UpdateTransactionInput,
    timestamp: string,
    userId: string,
    id: string,
  ): {
    TableName: string;
    Key: { userId: string; id: string };
    UpdateExpression: string;
    ConditionExpression: string;
    ExpressionAttributeNames?: Record<string, string>;
    ExpressionAttributeValues: Record<string, unknown>;
    ReturnValues: "ALL_NEW";
  } {
    const setExpressionParts: string[] = ["updatedAt = :updatedAt"];
    const removeExpressionParts: string[] = [];
    const expressionAttributeValues: Record<string, unknown> = {
      ":updatedAt": timestamp,
      ":isArchived": true,
    };
    const expressionAttributeNames: Record<string, string> = {};

    if (input.accountId !== undefined) {
      setExpressionParts.push("accountId = :accountId");
      expressionAttributeValues[":accountId"] = input.accountId;
    }

    if (input.categoryId !== undefined) {
      if (input.categoryId === null) {
        removeExpressionParts.push("categoryId");
      } else {
        setExpressionParts.push("categoryId = :categoryId");
        expressionAttributeValues[":categoryId"] = input.categoryId;
      }
    }

    if (input.type !== undefined) {
      setExpressionParts.push("#type = :type");
      expressionAttributeValues[":type"] = input.type;
      expressionAttributeNames["#type"] = "type";
    }

    if (input.amount !== undefined) {
      setExpressionParts.push("amount = :amount");
      expressionAttributeValues[":amount"] = input.amount;
    }

    if (input.currency !== undefined) {
      setExpressionParts.push("currency = :currency");
      expressionAttributeValues[":currency"] = input.currency;
    }

    if (input.date !== undefined) {
      setExpressionParts.push("#date = :date");
      expressionAttributeValues[":date"] = input.date;
      expressionAttributeNames["#date"] = "date";
    }

    if (input.description !== undefined) {
      if (input.description === null) {
        removeExpressionParts.push("description");
      } else {
        setExpressionParts.push("description = :description");
        expressionAttributeValues[":description"] = input.description;
      }
    }

    // Build UpdateExpression with both SET and REMOVE clauses
    const updateExpressionParts: string[] = [];
    if (setExpressionParts.length > 0) {
      updateExpressionParts.push(`SET ${setExpressionParts.join(", ")}`);
    }
    if (removeExpressionParts.length > 0) {
      updateExpressionParts.push(`REMOVE ${removeExpressionParts.join(", ")}`);
    }

    return {
      TableName: this.tableName,
      Key: { userId, id },
      UpdateExpression: updateExpressionParts.join(" "),
      ConditionExpression:
        "attribute_exists(userId) AND attribute_exists(id) AND isArchived <> :isArchived",
      ...(Object.keys(expressionAttributeNames).length > 0 && {
        ExpressionAttributeNames: expressionAttributeNames,
      }),
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    };
  }

  private async countActiveTransactions(
    queryParams: TransactionQueryParams,
  ): Promise<number> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: queryParams.indexName,
        KeyConditionExpression: queryParams.keyConditionExpression,
        FilterExpression: queryParams.filterExpression,
        ...(Object.keys(queryParams.expressionAttributeNames).length > 0 && {
          ExpressionAttributeNames: queryParams.expressionAttributeNames,
        }),
        ExpressionAttributeValues: queryParams.expressionAttributeValues,
        Select: "COUNT",
      });

      const result = await this.client.send(command);
      return result.Count || 0;
    } catch (error) {
      console.error("Error getting active transaction count:", error);
      throw new TransactionRepositoryError(
        "Failed to get active transaction count",
        "QUERY_FAILED",
        error,
      );
    }
  }
}

// Export the error class for use in resolvers
export { TransactionRepositoryError };
