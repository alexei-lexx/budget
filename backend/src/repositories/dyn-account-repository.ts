import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import {
  BatchGetCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { AccountEntity } from "../models/account";
import { AccountRepository } from "../ports/account-repository";
import {
  RepositoryError,
  VersionConflictError,
} from "../ports/repository-error";
import { DynBaseRepository } from "./dyn-base-repository";
import { accountDataSchema } from "./schemas/account";
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
  }): Promise<AccountEntity | null> {
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

      const data = hydrate(accountDataSchema, result.Item);
      const account = AccountEntity.fromPersistence(data);

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

  async findManyByUserId(userId: string): Promise<AccountEntity[]> {
    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
    }

    try {
      const result = await paginateQuery({
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
        schema: accountDataSchema,
      });

      const accounts = result.items.map((data) =>
        AccountEntity.fromPersistence(data),
      );

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
  }): Promise<AccountEntity[]> {
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
        AccountEntity.fromPersistence(hydrate(accountDataSchema, item)),
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

  async findManyWithArchivedByUserId(userId: string): Promise<AccountEntity[]> {
    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
    }

    try {
      const result = await paginateQuery({
        client: this.client,
        params: {
          TableName: this.tableName,
          KeyConditionExpression: "userId = :userId",
          ExpressionAttributeValues: {
            ":userId": userId,
          },
        },
        pageSize: undefined, // No pageSize = get all items
        schema: accountDataSchema,
      });

      return result.items.map((data) => AccountEntity.fromPersistence(data));
    } catch (error) {
      console.error("Error finding all accounts by user ID:", error);
      throw new RepositoryError(
        "Failed to find all accounts",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async create(account: Readonly<AccountEntity>): Promise<void> {
    const data = account.toData();

    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: data,
        ConditionExpression: "attribute_not_exists(id)",
      });

      await this.client.send(command);
    } catch (error) {
      console.error("Error creating account:", error);
      throw new RepositoryError(
        "Failed to create account",
        "CREATE_FAILED",
        error,
      );
    }
  }

  async update(account: Readonly<AccountEntity>): Promise<AccountEntity> {
    const data = account.toData();

    try {
      const setParts = [
        "#name = :name",
        "currency = :currency",
        "initialBalance = :initialBalance",
        "isArchived = :isArchived",
        "updatedAt = :updatedAt",
        "version = :nextVersion",
      ];

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { userId: data.userId, id: data.id },
        UpdateExpression: `SET ${setParts.join(", ")}`,
        ConditionExpression:
          "attribute_exists(userId) AND attribute_exists(id) AND version = :currentVersion",
        ExpressionAttributeNames: { "#name": "name" },
        ExpressionAttributeValues: {
          ":name": data.name,
          ":currency": data.currency,
          ":initialBalance": data.initialBalance,
          ":isArchived": data.isArchived,
          ":updatedAt": data.updatedAt,
          ":currentVersion": data.version,
          ":nextVersion": data.version + 1,
        },
      });

      await this.client.send(command);
      return account.bumpVersion();
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        throw new VersionConflictError(error);
      }

      console.error("Error updating account:", error);
      throw new RepositoryError(
        "Failed to update account",
        "UPDATE_FAILED",
        error,
      );
    }
  }
}
