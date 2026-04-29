import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import {
  BatchGetCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Account } from "../models/account";
import { AccountRepository } from "../ports/account-repository";
import {
  RepositoryError,
  VersionConflictError,
} from "../ports/repository-error";
import { DynBaseRepository } from "./dyn-base-repository";
import { accountDataSchema } from "./schemas/account";
import { hydrate } from "./utils/hydrate";
import { paginateQuery } from "./utils/query";
import { UpdateWriteItem } from "./utils/transact-write";

/**
 * Builds a TransactWrite Update item
 * that persists every mutable field on the Account row,
 * with optimistic-lock condition on `version`.
 * Used by both the repository's own `update` and `DynLedgerWriter`.
 */
export function buildUpdateAccountItem(
  account: Readonly<Account>,
  tableName: string,
): UpdateWriteItem {
  const setParts = [
    "#name = :name",
    "currency = :currency",
    "initialBalance = :initialBalance",
    "transactionBalance = :transactionBalance",
    "isArchived = :isArchived",
    "updatedAt = :updatedAt",
    "version = :nextVersion",
  ];

  return {
    Update: {
      TableName: tableName,
      Key: { userId: account.userId, id: account.id },
      UpdateExpression: `SET ${setParts.join(", ")}`,
      ConditionExpression:
        "attribute_exists(userId) AND attribute_exists(id) AND version = :currentVersion",
      ExpressionAttributeNames: { "#name": "name" },
      ExpressionAttributeValues: {
        ":name": account.name,
        ":currency": account.currency,
        ":initialBalance": account.initialBalance,
        ":transactionBalance": account.transactionBalance,
        ":isArchived": account.isArchived,
        ":updatedAt": account.updatedAt,
        ":currentVersion": account.version,
        ":nextVersion": account.version + 1,
      },
      ReturnValuesOnConditionCheckFailure: "ALL_OLD",
    },
  };
}

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

      const data = hydrate(accountDataSchema, result.Item);
      const account = Account.fromPersistence(data);

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

  async findOneWithArchivedById({
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

      const data = hydrate(accountDataSchema, result.Item);
      return Account.fromPersistence(data);
    } catch (error) {
      console.error("Error finding account by ID (with archived):", error);
      throw new RepositoryError("Failed to find account", "GET_FAILED", error);
    }
  }

  async findManyByUserId(userId: string): Promise<Account[]> {
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
        Account.fromPersistence(data),
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
        Account.fromPersistence(hydrate(accountDataSchema, item)),
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

      return result.items.map((data) => Account.fromPersistence(data));
    } catch (error) {
      console.error("Error finding all accounts by user ID:", error);
      throw new RepositoryError(
        "Failed to find all accounts",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async create(account: Readonly<Account>): Promise<void> {
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

  async update(account: Readonly<Account>): Promise<Account> {
    const { Update } = buildUpdateAccountItem(account, this.tableName);

    try {
      const command = new UpdateCommand(Update);

      await this.client.send(command);
      return account.bumpVersion();
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        // ReturnValuesOnConditionCheckFailure returns the pre-write row.
        // Present = version mismatch. Absent = row missing.
        if (error.Item) {
          throw new VersionConflictError(error);
        }

        throw new RepositoryError("Account not found", "NOT_FOUND", error);
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
