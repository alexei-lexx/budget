import {
  ConditionalCheckFailedException,
  TransactionCanceledException,
} from "@aws-sdk/client-dynamodb";
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { monotonicFactory } from "ulidx";
import { z } from "zod";
import {
  Transaction,
  TransactionPattern,
  TransactionPatternType,
  TransactionType,
} from "../models/transaction";
import {
  RepositoryError,
  VersionConflictError,
} from "../ports/repository-error";
import {
  TransactionConnection,
  TransactionEdge,
  TransactionFilterInput,
  TransactionRepository,
} from "../ports/transaction-repository";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
  PageInfo,
  PaginationInput,
} from "../types/pagination";
import { DYNAMODB_TRANSACT_WRITE_MAX_ITEMS } from "../utils/dynamo-client";
import { DynBaseRepository } from "./dyn-base-repository";
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
    throw new RepositoryError("Invalid cursor format", "INVALID_CURSOR", error);
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

export class DynTransactionRepository
  extends DynBaseRepository
  implements TransactionRepository
{
  async findOneById({
    id,
    userId,
  }: {
    id: string;
    userId: string;
  }): Promise<Transaction | null> {
    if (!id) {
      throw new RepositoryError(
        "Transaction ID is required",
        "INVALID_PARAMETERS",
      );
    }

    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
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
      throw new RepositoryError(
        "Failed to find transaction",
        "GET_FAILED",
        error,
      );
    }
  }

  async findManyByUserId(
    userId: string,
    filters?: TransactionFilterInput,
  ): Promise<Transaction[]> {
    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
    }

    try {
      // Build query parameters (index selection, key condition, filters)
      const queryParams = this.buildQueryParams(userId, filters);

      const { items } = await paginateQuery<Transaction>({
        client: this.client,
        params: {
          TableName: this.tableName,
          IndexName: queryParams.indexName,
          KeyConditionExpression: queryParams.keyConditionExpression,
          FilterExpression: queryParams.filterExpression,
          ...(Object.keys(queryParams.expressionAttributeNames).length > 0 && {
            ExpressionAttributeNames: queryParams.expressionAttributeNames,
          }),
          ExpressionAttributeValues: queryParams.expressionAttributeValues,
          ScanIndexForward: false, // Descending order (newest first)
        },
        pageSize: undefined, // No pageSize = get all items
        schema: transactionSchema,
      });

      return items;
    } catch (error) {
      console.error("Error finding transactions by user ID:", error);
      throw new RepositoryError(
        "Failed to find transactions by user ID",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async findManyByUserIdPaginated(
    userId: string,
    pagination?: PaginationInput,
    filters?: TransactionFilterInput,
  ): Promise<TransactionConnection> {
    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
    }

    // Default pagination values
    const first = pagination?.first || DEFAULT_PAGE_SIZE;
    const after = pagination?.after;

    // Validate pagination parameters
    if (first < MIN_PAGE_SIZE || first > MAX_PAGE_SIZE) {
      throw new RepositoryError(
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
        endCursor: edges.length > 0 ? edges.at(-1)?.cursor : undefined,
      };

      // Get total count (this is a separate query for accuracy)
      const totalCount = await this.countActiveTransactions(queryParams);

      return {
        edges,
        pageInfo,
        totalCount,
      };
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }

      console.error("Error finding paginated transactions:", error);
      throw new RepositoryError(
        "Failed to find paginated transactions",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async findManyByAccountId({
    accountId,
    userId,
  }: {
    accountId: string;
    userId: string;
  }): Promise<Transaction[]> {
    if (!accountId) {
      throw new RepositoryError("Account ID is required", "INVALID_PARAMETERS");
    }

    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
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
      throw new RepositoryError(
        "Failed to find transactions by account",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async findManyByTransferId({
    transferId,
    userId,
  }: {
    transferId: string;
    userId: string;
  }): Promise<Transaction[]> {
    if (!transferId) {
      throw new RepositoryError(
        "Transfer ID is required",
        "INVALID_PARAMETERS",
      );
    }

    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
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
      throw new RepositoryError(
        "Failed to find transactions by transfer",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async findManyByDescription({
    userId,
    searchText,
    limit,
  }: {
    userId: string;
    searchText: string;
    limit: number;
  }): Promise<Transaction[]> {
    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
    }

    if (!Number.isInteger(limit) || limit <= 0) {
      throw new RepositoryError(
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
      throw new RepositoryError(
        "Failed to search transactions by description",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async create(transaction: Readonly<Transaction>): Promise<void> {
    try {
      const dbItem: TransactionDbItem = {
        ...transaction,
        createdAtSortable: buildCreatedAtSortable(transaction),
      };

      const command = new PutCommand({
        TableName: this.tableName,
        Item: dbItem,
        ConditionExpression: "attribute_not_exists(id)",
      });

      await this.client.send(command);
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        throw new RepositoryError(
          "Transaction with this ID already exists",
          "CREATE_FAILED",
        );
      }

      console.error("Error creating transaction:", error);
      throw new RepositoryError(
        "Failed to create transaction",
        "CREATE_FAILED",
        error,
      );
    }
  }

  async createMany(
    transactions: readonly Readonly<Transaction>[],
  ): Promise<void> {
    if (!transactions.length) {
      throw new RepositoryError(
        "At least one transaction is required",
        "INVALID_PARAMETERS",
      );
    }

    if (transactions.length > DYNAMODB_TRANSACT_WRITE_MAX_ITEMS) {
      throw new RepositoryError(
        `DynamoDB transactions support a maximum of ${DYNAMODB_TRANSACT_WRITE_MAX_ITEMS} items`,
        "TOO_MANY_ITEMS",
      );
    }

    try {
      const transactItems = transactions.map((transaction) => ({
        Put: {
          TableName: this.tableName,
          Item: {
            ...transaction,
            createdAtSortable: buildCreatedAtSortable(transaction),
          },
          ConditionExpression: "attribute_not_exists(id)",
        },
      }));

      const command = new TransactWriteCommand({
        TransactItems: transactItems,
      });

      await this.client.send(command);
    } catch (error) {
      if (error instanceof TransactionCanceledException) {
        throw new RepositoryError(
          "Transaction with this ID already exists",
          "CREATE_FAILED",
        );
      }

      console.error("Error creating transactions atomically:", error);
      throw new RepositoryError(
        "Failed to create transactions atomically",
        "TRANSACT_WRITE_FAILED",
        error,
      );
    }
  }

  async update(transaction: Readonly<Transaction>): Promise<Transaction> {
    const updateParams = this.buildUpdateParams(transaction);

    try {
      const command = new UpdateCommand({
        ...updateParams,
        ReturnValuesOnConditionCheckFailure: "ALL_OLD",
      });
      await this.client.send(command);
      return { ...transaction, version: transaction.version + 1 };
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        // ReturnValuesOnConditionCheckFailure returns the pre-write row.
        // Present = version mismatch. Absent = row missing.
        if (error.Item) {
          throw new VersionConflictError(error);
        }

        throw new RepositoryError("Transaction not found", "NOT_FOUND", error);
      }

      throw new RepositoryError(
        "Failed to update transaction",
        "UPDATE_FAILED",
        error,
      );
    }
  }

  async updateMany(
    transactions: readonly Readonly<Transaction>[],
  ): Promise<Transaction[]> {
    if (!transactions.length) {
      throw new RepositoryError(
        "At least one transaction is required",
        "INVALID_PARAMETERS",
      );
    }

    if (transactions.length > DYNAMODB_TRANSACT_WRITE_MAX_ITEMS) {
      throw new RepositoryError(
        `DynamoDB transactions support a maximum of ${DYNAMODB_TRANSACT_WRITE_MAX_ITEMS} items`,
        "TOO_MANY_ITEMS",
      );
    }

    try {
      const transactItems = transactions.map((transaction) => ({
        Update: {
          ...this.buildUpdateParams(transaction),
          ReturnValuesOnConditionCheckFailure: "ALL_OLD" as const,
        },
      }));

      const command = new TransactWriteCommand({
        TransactItems: transactItems,
      });

      await this.client.send(command);
      return transactions.map((transaction) => ({
        ...transaction,
        version: transaction.version + 1,
      }));
    } catch (error) {
      if (error instanceof TransactionCanceledException) {
        const reasons = error.CancellationReasons ?? [];

        // Any version mismatch takes precedence over missing rows.
        const hasConflict = reasons.some(
          (reason) =>
            reason.Code === "ConditionalCheckFailed" &&
            reason.Item !== undefined,
        );

        if (hasConflict) {
          throw new VersionConflictError(error);
        }

        const hasMissing = reasons.some(
          (reason) =>
            reason.Code === "ConditionalCheckFailed" &&
            reason.Item === undefined,
        );

        if (hasMissing) {
          throw new RepositoryError(
            "One or more transactions not found",
            "NOT_FOUND",
            error,
          );
        }
      }

      console.error("Error updating transactions atomically:", error);
      throw new RepositoryError(
        "Failed to update transactions atomically",
        "UPDATE_MANY_FAILED",
        error,
      );
    }
  }

  async hasTransactionsForAccount({
    accountId,
    userId,
  }: {
    accountId: string;
    userId: string;
  }): Promise<boolean> {
    if (!accountId) {
      throw new RepositoryError("Account ID is required", "INVALID_PARAMETERS");
    }

    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
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
      throw new RepositoryError(
        "Failed to check transactions for account",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async detectPatterns({
    userId,
    type,
    limit,
    sampleSize,
  }: {
    userId: string;
    type: TransactionPatternType;
    limit: number;
    sampleSize: number;
  }): Promise<TransactionPattern[]> {
    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
    }

    if (!Number.isInteger(limit) || limit <= 0) {
      throw new RepositoryError(
        "Limit must be a positive integer",
        "INVALID_PARAMETERS",
      );
    }

    if (!Number.isInteger(sampleSize) || sampleSize <= 0) {
      throw new RepositoryError(
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
      if (error instanceof RepositoryError) {
        throw error;
      }

      console.error("Error getting account category patterns:", error);
      throw new RepositoryError(
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

  private buildUpdateParams(transaction: Transaction): {
    TableName: string;
    Key: { userId: string; id: string };
    UpdateExpression: string;
    ConditionExpression: string;
    ExpressionAttributeNames: Record<string, string>;
    ExpressionAttributeValues: Record<string, unknown>;
  } {
    const setParts: string[] = [
      "accountId = :accountId",
      "#type = :type",
      "amount = :amount",
      "currency = :currency",
      "#date = :date",
      "isArchived = :isArchived",
      "version = :newVersion",
      "createdAt = :createdAt",
      "updatedAt = :updatedAt",
    ];
    const removeParts: string[] = [];
    const expressionAttributeNames: Record<string, string> = {
      "#type": "type",
      "#date": "date",
    };
    const expressionAttributeValues: Record<string, unknown> = {
      ":accountId": transaction.accountId,
      ":type": transaction.type,
      ":amount": transaction.amount,
      ":currency": transaction.currency,
      ":date": transaction.date,
      ":isArchived": transaction.isArchived,
      ":expectedVersion": transaction.version,
      ":newVersion": transaction.version + 1,
      ":createdAt": transaction.createdAt,
      ":updatedAt": transaction.updatedAt,
    };

    if (transaction.categoryId !== undefined) {
      setParts.push("categoryId = :categoryId");
      expressionAttributeValues[":categoryId"] = transaction.categoryId;
    } else {
      removeParts.push("categoryId");
    }

    if (transaction.description !== undefined) {
      setParts.push("description = :description");
      expressionAttributeValues[":description"] = transaction.description;
    } else {
      removeParts.push("description");
    }

    if (transaction.transferId !== undefined) {
      setParts.push("transferId = :transferId");
      expressionAttributeValues[":transferId"] = transaction.transferId;
    } else {
      removeParts.push("transferId");
    }

    const updateExpressionParts: string[] = [`SET ${setParts.join(", ")}`];
    if (removeParts.length > 0) {
      updateExpressionParts.push(`REMOVE ${removeParts.join(", ")}`);
    }

    return {
      TableName: this.tableName,
      Key: { userId: transaction.userId, id: transaction.id },
      UpdateExpression: updateExpressionParts.join(" "),
      ConditionExpression:
        "attribute_exists(userId) AND attribute_exists(id) AND version = :expectedVersion",
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
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
      throw new RepositoryError(
        "Failed to get active transaction count",
        "QUERY_FAILED",
        error,
      );
    }
  }
}
