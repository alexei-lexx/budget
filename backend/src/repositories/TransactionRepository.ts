import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  GetCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import {
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  ITransactionRepository,
  TransactionConnection,
  TransactionEdge,
} from "../models/Transaction";
import {
  PaginationInput,
  PageInfo,
  DEFAULT_PAGE_SIZE,
  MIN_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "../types/pagination";
import { paginateQuery } from "./utils/pagination";
import { createDynamoDBDocumentClient } from "./utils/dynamoClient";

/**
 * Maximum number of items that can be included in a single DynamoDB TransactWrite operation
 * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Limits.html#limits-api
 */
const DYNAMODB_TRANSACT_WRITE_MAX_ITEMS = 25;

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
  createdAt: string;
  id: string;
}

/**
 * Cursor utilities for pagination
 */
function encodeCursor(transaction: Transaction): string {
  const cursorData: CursorData = {
    createdAt: transaction.createdAt,
    id: transaction.id,
  };
  return Buffer.from(JSON.stringify(cursorData)).toString("base64");
}

function decodeCursor(cursor: string): CursorData {
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const cursorData = JSON.parse(decoded) as CursorData;

    // Validate cursor structure
    if (!cursorData.createdAt || !cursorData.id) {
      throw new Error("Invalid cursor structure");
    }

    return cursorData;
  } catch (error) {
    throw new TransactionRepositoryError(
      "Invalid cursor format",
      "INVALID_CURSOR",
      error,
    );
  }
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
      const command = new PutCommand({
        TableName: this.tableName,
        Item: transaction,
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
          Item: transaction,
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

    // Build update expression dynamically
    const updateExpressionParts: string[] = ["updatedAt = :updatedAt"];
    const expressionAttributeValues: Record<string, unknown> = {
      ":updatedAt": now,
    };

    if (input.accountId !== undefined) {
      updateExpressionParts.push("accountId = :accountId");
      expressionAttributeValues[":accountId"] = input.accountId;
    }

    if (input.categoryId !== undefined) {
      if (input.categoryId === null) {
        updateExpressionParts.push("categoryId = :categoryId");
        expressionAttributeValues[":categoryId"] = null;
      } else {
        updateExpressionParts.push("categoryId = :categoryId");
        expressionAttributeValues[":categoryId"] = input.categoryId;
      }
    }

    if (input.type !== undefined) {
      updateExpressionParts.push("#type = :type");
      expressionAttributeValues[":type"] = input.type;
    }

    if (input.amount !== undefined) {
      updateExpressionParts.push("amount = :amount");
      expressionAttributeValues[":amount"] = input.amount;
    }

    if (input.currency !== undefined) {
      updateExpressionParts.push("currency = :currency");
      expressionAttributeValues[":currency"] = input.currency;
    }

    if (input.date !== undefined) {
      updateExpressionParts.push("#date = :date");
      expressionAttributeValues[":date"] = input.date;
    }

    if (input.description !== undefined) {
      if (input.description === null) {
        updateExpressionParts.push("description = :description");
        expressionAttributeValues[":description"] = null;
      } else {
        updateExpressionParts.push("description = :description");
        expressionAttributeValues[":description"] = input.description;
      }
    }

    try {
      const expressionAttributeNames: Record<string, string> = {};
      if (input.type !== undefined) {
        expressionAttributeNames["#type"] = "type";
      }
      if (input.date !== undefined) {
        expressionAttributeNames["#date"] = "date";
      }

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { userId, id },
        UpdateExpression: `SET ${updateExpressionParts.join(", ")}`,
        ConditionExpression:
          "attribute_exists(userId) AND attribute_exists(id) AND isArchived <> :isArchived",
        ...(Object.keys(expressionAttributeNames).length > 0 && {
          ExpressionAttributeNames: expressionAttributeNames,
        }),
        ExpressionAttributeValues: {
          ...expressionAttributeValues,
          ":isArchived": true,
        },
        ReturnValues: "ALL_NEW",
      });

      const result = await this.client.send(command);
      return result.Attributes as Transaction;
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
        // Build update expression dynamically based on provided fields
        const updateExpressionParts: string[] = ["updatedAt = :updatedAt"];
        const expressionAttributeValues: Record<string, unknown> = {
          ":updatedAt": now,
          ":isArchived": true,
        };
        const expressionAttributeNames: Record<string, string> = {};

        if (input.accountId !== undefined) {
          updateExpressionParts.push("accountId = :accountId_" + id);
          expressionAttributeValues[":accountId_" + id] = input.accountId;
        }

        if (input.categoryId !== undefined) {
          if (input.categoryId === null) {
            updateExpressionParts.push("categoryId = :categoryId_" + id);
            expressionAttributeValues[":categoryId_" + id] = null;
          } else {
            updateExpressionParts.push("categoryId = :categoryId_" + id);
            expressionAttributeValues[":categoryId_" + id] = input.categoryId;
          }
        }

        if (input.type !== undefined) {
          updateExpressionParts.push("#type = :type_" + id);
          expressionAttributeValues[":type_" + id] = input.type;
          expressionAttributeNames["#type"] = "type";
        }

        if (input.amount !== undefined) {
          updateExpressionParts.push("amount = :amount_" + id);
          expressionAttributeValues[":amount_" + id] = input.amount;
        }

        if (input.currency !== undefined) {
          updateExpressionParts.push("currency = :currency_" + id);
          expressionAttributeValues[":currency_" + id] = input.currency;
        }

        if (input.date !== undefined) {
          updateExpressionParts.push("#date = :date_" + id);
          expressionAttributeValues[":date_" + id] = input.date;
          expressionAttributeNames["#date"] = "date";
        }

        if (input.description !== undefined) {
          if (input.description === null) {
            updateExpressionParts.push("description = :description_" + id);
            expressionAttributeValues[":description_" + id] = null;
          } else {
            updateExpressionParts.push("description = :description_" + id);
            expressionAttributeValues[":description_" + id] = input.description;
          }
        }

        return {
          Update: {
            TableName: this.tableName,
            Key: { userId, id },
            UpdateExpression: `SET ${updateExpressionParts.join(", ")}`,
            ConditionExpression:
              "attribute_exists(userId) AND attribute_exists(id) AND isArchived <> :isArchived",
            ExpressionAttributeNames:
              Object.keys(expressionAttributeNames).length > 0
                ? expressionAttributeNames
                : undefined,
            ExpressionAttributeValues: expressionAttributeValues,
          },
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
      return result.Attributes as Transaction;
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
      const keyConditionExpression = "userId = :userId";
      const filterExpression = "isArchived = :isArchived";
      const expressionAttributeValues: Record<string, unknown> = {
        ":userId": userId,
        ":isArchived": false,
      };

      // Use pagination utility to handle filtering correctly
      const { items: transactions, hasNextPage } =
        await paginateQuery<Transaction>({
          client: this.client,
          params: {
            TableName: this.tableName,
            IndexName: "UserCreatedAtIndex",
            KeyConditionExpression: keyConditionExpression,
            FilterExpression: filterExpression,
            ExpressionAttributeValues: expressionAttributeValues,
            ScanIndexForward: false,
            ...(after && {
              ExclusiveStartKey: {
                userId: userId,
                id: decodeCursor(after).id,
                createdAt: decodeCursor(after).createdAt,
              },
            }),
          },
          options: { pageSize: first },
        });

      // Create edges with cursors
      const edges: TransactionEdge[] = transactions.map((transaction) => ({
        node: transaction,
        cursor: encodeCursor(transaction),
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
      const totalCount = await this.countActiveTransactions(userId);

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

  async findById(id: string, userId: string): Promise<Transaction | null> {
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

      const transaction = result.Item as Transaction;

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

  async findByAccountId(
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
        options: {}, // No pageSize = get all items
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

  async findByTransferId(
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
        options: {}, // No pageSize = get all items
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

  private async countActiveTransactions(userId: string): Promise<number> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: "UserCreatedAtIndex",
        KeyConditionExpression: "userId = :userId",
        FilterExpression: "isArchived = :isArchived",
        ExpressionAttributeValues: {
          ":userId": userId,
          ":isArchived": false,
        },
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
