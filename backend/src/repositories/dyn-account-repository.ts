import { randomUUID } from "crypto";
import {
  BatchGetCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Account } from "../models/account";
import {
  AccountRepository,
  CreateAccountInput,
  UpdateAccountInput,
} from "../ports/account-repository";
import { RepositoryError } from "../ports/repository-error";
import { DynBaseRepository } from "./dyn-base-repository";
import { accountSchema } from "./schemas/account";
import { hydrate } from "./utils/hydrate";
import { paginateQuery } from "./utils/query";

export class DynAccountRepository
  extends DynBaseRepository
  implements AccountRepository
{
  async findOneById({
    id,
    userId,
  }: {
    id: string;
    userId: string;
  }): Promise<Account | null> {
    if (!id) {
      throw new RepositoryError("Account ID is required", "INVALID_PARAMETERS");
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

      const account = hydrate(accountSchema, result.Item);

      // Return null if account is archived (soft deleted)
      if (account.isArchived) {
        return null;
      }

      return account;
    } catch (error) {
      console.error("Error finding account by ID:", error);
      throw new RepositoryError("Failed to find account", "GET_FAILED", error);
    }
  }

  async findManyByUserId(userId: string): Promise<Account[]> {
    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
    }

    try {
      const result = await paginateQuery<Account>({
        client: this.client,
        params: {
          TableName: this.tableName,
          KeyConditionExpression: "userId = :userId",
          FilterExpression: "isArchived = :isArchived",
          ExpressionAttributeValues: {
            ":userId": userId,
            ":isArchived": false,
          },
        },
        pageSize: undefined, // No pageSize = get all items
        schema: accountSchema,
      });

      const accounts = result.items;

      // Sort accounts by name (case-insensitive)
      return accounts.sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
      );
    } catch (error) {
      console.error("Error finding active accounts by user ID:", error);
      throw new RepositoryError(
        "Failed to find active accounts",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async findManyWithArchivedByIds({
    ids,
    userId,
  }: {
    ids: readonly string[];
    userId: string;
  }): Promise<Account[]> {
    if (ids.length === 0) {
      return [];
    }

    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
    }

    try {
      const command = new BatchGetCommand({
        RequestItems: {
          [this.tableName]: {
            Keys: ids.map((id) => ({ userId, id })),
          },
        },
      });

      const result = await this.client.send(command);
      return (result.Responses?.[this.tableName] || []).map((item) =>
        hydrate(accountSchema, item),
      );
    } catch (error) {
      console.error("Error batch finding accounts by IDs:", error);
      throw new RepositoryError(
        "Failed to batch find accounts",
        "BATCH_GET_FAILED",
        error,
      );
    }
  }

  async findManyWithArchivedByUserId(userId: string): Promise<Account[]> {
    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
    }

    try {
      const result = await paginateQuery<Account>({
        client: this.client,
        params: {
          TableName: this.tableName,
          KeyConditionExpression: "userId = :userId",
          ExpressionAttributeValues: {
            ":userId": userId,
          },
        },
        pageSize: undefined, // No pageSize = get all items
        schema: accountSchema,
      });

      return result.items;
    } catch (error) {
      console.error("Error finding all accounts by user ID:", error);
      throw new RepositoryError(
        "Failed to find all accounts",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async create(input: CreateAccountInput): Promise<Account> {
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
      throw new RepositoryError(
        "Failed to create account",
        "CREATE_FAILED",
        error,
      );
    }
  }

  async update(
    { id, userId }: { id: string; userId: string },
    input: UpdateAccountInput,
  ): Promise<Account> {
    if (!id) {
      throw new RepositoryError("Account ID is required", "INVALID_PARAMETERS");
    }

    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
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
      return hydrate(accountSchema, result.Attributes);
    } catch (error) {
      console.error("Error updating account:", error);

      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        throw new RepositoryError(
          "Account not found or is archived",
          "NOT_FOUND",
        );
      }

      throw new RepositoryError(
        "Failed to update account",
        "UPDATE_FAILED",
        error,
      );
    }
  }

  async archive({
    id,
    userId,
  }: {
    id: string;
    userId: string;
  }): Promise<Account> {
    if (!id) {
      throw new RepositoryError("Account ID is required", "INVALID_PARAMETERS");
    }

    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
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
      return hydrate(accountSchema, result.Attributes);
    } catch (error) {
      console.error("Error archiving account:", error);

      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        throw new RepositoryError(
          "Account not found or already archived",
          "NOT_FOUND",
        );
      }

      throw new RepositoryError(
        "Failed to archive account",
        "ARCHIVE_FAILED",
        error,
      );
    }
  }
}
