import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
  IAccountRepository,
} from "../models/Account.js";

/**
 * Repository error class for better error handling
 */
class AccountRepositoryError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = "AccountRepositoryError";
  }
}

export class AccountRepository implements IAccountRepository {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor(dynamoClient?: DynamoDBClient) {
    const client =
      dynamoClient ||
      new DynamoDBClient({
        region: process.env.AWS_REGION || "",
        ...(process.env.NODE_ENV === "development" && {
          endpoint: process.env.DYNAMODB_ENDPOINT || "",
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
          },
        }),
      });
    this.client = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.ACCOUNTS_TABLE_NAME || "";

    if (!this.tableName) {
      throw new AccountRepositoryError(
        "ACCOUNTS_TABLE_NAME environment variable is required",
        "MISSING_TABLE_NAME",
      );
    }
  }

  /**
   * Check if an account with the same name exists for the user among active accounts
   */
  private async checkDuplicateName(
    userId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    try {
      const existingAccounts = await this.findActiveByUserId(userId);
      const duplicateAccount = existingAccounts.find(
        (account) =>
          account.name.toLowerCase() === name.toLowerCase() &&
          account.id !== excludeId,
      );

      if (duplicateAccount) {
        throw new AccountRepositoryError(
          `An account named "${name}" already exists`,
          "DUPLICATE_NAME",
        );
      }
    } catch (error) {
      if (error instanceof AccountRepositoryError) {
        throw error;
      }
      throw new AccountRepositoryError(
        "Failed to check for duplicate account names",
        "DUPLICATE_CHECK_FAILED",
        error,
      );
    }
  }

  async findActiveByUserId(userId: string): Promise<Account[]> {
    if (!userId) {
      throw new AccountRepositoryError(
        "User ID is required",
        "INVALID_USER_ID",
      );
    }

    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "userId = :userId",
        FilterExpression: "isArchived = :isArchived",
        ExpressionAttributeValues: {
          ":userId": userId,
          ":isArchived": false,
        },
      });

      const result = await this.client.send(command);
      const accounts = (result.Items || []) as Account[];

      // Sort accounts by name (case-insensitive)
      return accounts.sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
      );
    } catch (error) {
      console.error("Error finding active accounts by user ID:", error);
      throw new AccountRepositoryError(
        "Failed to find active accounts",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async findById(id: string, userId: string): Promise<Account | null> {
    if (!id || !userId) {
      throw new AccountRepositoryError(
        "Account ID and User ID are required",
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

      const account = result.Item as Account;

      // Return null if account is archived (soft deleted)
      if (account.isArchived) {
        return null;
      }

      return account;
    } catch (error) {
      console.error("Error finding account by ID:", error);
      throw new AccountRepositoryError(
        "Failed to find account",
        "GET_FAILED",
        error,
      );
    }
  }

  async create(input: CreateAccountInput): Promise<Account> {
    // Check for duplicate account names
    await this.checkDuplicateName(input.userId, input.name);

    const now = new Date().toISOString();
    const account: Account = {
      id: randomUUID(),
      userId: input.userId,
      name: input.name,
      currency: input.currency,
      initialBalance: input.initialBalance,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: account,
      });

      await this.client.send(command);
      return account;
    } catch (error) {
      console.error("Error creating account:", error);
      throw new AccountRepositoryError(
        "Failed to create account",
        "CREATE_FAILED",
        error,
      );
    }
  }

  async update(
    id: string,
    userId: string,
    input: UpdateAccountInput,
  ): Promise<Account> {
    if (!id || !userId) {
      throw new AccountRepositoryError(
        "Account ID and User ID are required",
        "INVALID_PARAMETERS",
      );
    }

    // Check for duplicate names if name is being updated
    if (input.name !== undefined) {
      await this.checkDuplicateName(userId, input.name, id);
    }

    const now = new Date().toISOString();

    // Build update expression dynamically
    const updateExpressionParts: string[] = ["updatedAt = :updatedAt"];
    const expressionAttributeValues: Record<string, string | number> = {
      ":updatedAt": now,
    };
    let hasNameUpdate = false;

    if (input.name !== undefined) {
      updateExpressionParts.push("#name = :name");
      expressionAttributeValues[":name"] = input.name;
      hasNameUpdate = true;
    }

    if (input.currency !== undefined) {
      updateExpressionParts.push("currency = :currency");
      expressionAttributeValues[":currency"] = input.currency;
    }

    if (input.initialBalance !== undefined) {
      updateExpressionParts.push("initialBalance = :initialBalance");
      expressionAttributeValues[":initialBalance"] = input.initialBalance;
    }

    try {
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { userId, id },
        UpdateExpression: `SET ${updateExpressionParts.join(", ")}`,
        ConditionExpression:
          "attribute_exists(userId) AND attribute_exists(id) AND isArchived <> :isArchived",
        ...(hasNameUpdate && { ExpressionAttributeNames: { "#name": "name" } }),
        ExpressionAttributeValues: {
          ...expressionAttributeValues,
          ":isArchived": true,
        },
        ReturnValues: "ALL_NEW",
      });

      const result = await this.client.send(command);
      return result.Attributes as Account;
    } catch (error) {
      console.error("Error updating account:", error);

      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        throw new AccountRepositoryError(
          "Account not found or is archived",
          "NOT_FOUND",
        );
      }

      throw new AccountRepositoryError(
        "Failed to update account",
        "UPDATE_FAILED",
        error,
      );
    }
  }

  async archive(id: string, userId: string): Promise<Account> {
    if (!id || !userId) {
      throw new AccountRepositoryError(
        "Account ID and User ID are required",
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
      return result.Attributes as Account;
    } catch (error) {
      console.error("Error archiving account:", error);

      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        throw new AccountRepositoryError(
          "Account not found or already archived",
          "NOT_FOUND",
        );
      }

      throw new AccountRepositoryError(
        "Failed to archive account",
        "ARCHIVE_FAILED",
        error,
      );
    }
  }
}

// Export the error class for use in resolvers
export { AccountRepositoryError };
