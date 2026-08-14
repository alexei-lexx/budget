import {
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { User } from "../models/user";
import { RepositoryError } from "../ports/repository-error";
import { UserRepository } from "../ports/user-repository";
import { normalizeEmail } from "../utils/email";
import { DynBaseRepository } from "./dyn-base-repository";
import { userSchema } from "./schemas/user";

export class DynUserRepository
  extends DynBaseRepository
  implements UserRepository
{
  async findOneByEmail(email: string): Promise<User | null> {
    try {
      const normalizedEmail = normalizeEmail(email);

      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: "EmailIndex",
        KeyConditionExpression: "email = :email",
        ExpressionAttributeValues: {
          ":email": normalizedEmail,
        },
      });

      const result = await this.client.send(command);

      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      if (result.Items.length > 1) {
        throw new RepositoryError(
          `Data integrity error: Multiple users found for email ${normalizedEmail}`,
          "QUERY_FAILED",
        );
      }

      return User.fromPersistence(this.hydrate(userSchema, result.Items[0]));
    } catch (error) {
      console.error("Error finding user by email:", error);
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError(
        "Failed to find user by email",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async findOneByMcpToken(mcpToken: string): Promise<User | null> {
    let result;

    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: "McpTokenIndex",
        KeyConditionExpression: "mcpToken = :mcpToken",
        ExpressionAttributeValues: {
          ":mcpToken": mcpToken,
        },
      });

      result = await this.client.send(command);
    } catch (error) {
      console.error("Error finding user by mcpToken:", error);

      throw new RepositoryError(
        "Failed to find user by mcpToken",
        "QUERY_FAILED",
        error,
      );
    }

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    if (result.Items.length > 1) {
      throw new RepositoryError(
        "Data integrity error: Multiple users found for mcpToken",
        "QUERY_FAILED",
      );
    }

    return User.fromPersistence(this.hydrate(userSchema, result.Items[0]));
  }

  async findOneById(id: string): Promise<User | null> {
    if (!id) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
    }

    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { id },
      });

      const result = await this.client.send(command);

      if (!result.Item) {
        return null;
      }

      return User.fromPersistence(this.hydrate(userSchema, result.Item));
    } catch (error) {
      console.error("Error finding user by ID:", error);
      throw new RepositoryError(
        "Failed to find user by ID",
        "GET_FAILED",
        error,
      );
    }
  }

  async findMany(): Promise<User[]> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
      });

      const result = await this.client.send(command);

      if (!result.Items) {
        return [];
      }

      return result.Items.map((item) =>
        User.fromPersistence(this.hydrate(userSchema, item)),
      );
    } catch (error) {
      console.error("Error finding all users:", error);
      throw new RepositoryError("Failed to find users", "QUERY_FAILED", error);
    }
  }

  async create(user: Readonly<User>): Promise<void> {
    const data = user.toData();

    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: data,
        ConditionExpression: "attribute_not_exists(id)",
      });

      await this.client.send(command);
    } catch (error) {
      console.error("Error creating user:", error);
      throw new RepositoryError(
        "Failed to create user",
        "CREATE_FAILED",
        error,
      );
    }
  }

  async update(user: Readonly<User>): Promise<void> {
    const setParts = [
      "createdAt = :createdAt",
      "email = :email",
      "mcpToken = :mcpToken",
      "updatedAt = :updatedAt",
    ];

    const expressionAttributeValues: Record<string, string | number> = {
      ":createdAt": user.createdAt,
      ":email": user.email,
      ":mcpToken": user.mcpToken,
      ":updatedAt": user.updatedAt,
    };

    const removeParts: string[] = [];

    if (user.interfaceLanguage !== undefined) {
      setParts.push("interfaceLanguage = :interfaceLanguage");
      expressionAttributeValues[":interfaceLanguage"] = user.interfaceLanguage;
    } else {
      removeParts.push("interfaceLanguage");
    }

    if (user.transactionPatternsLimit !== undefined) {
      setParts.push("transactionPatternsLimit = :transactionPatternsLimit");
      expressionAttributeValues[":transactionPatternsLimit"] =
        user.transactionPatternsLimit;
    } else {
      removeParts.push("transactionPatternsLimit");
    }

    if (user.voiceInputLanguage !== undefined) {
      setParts.push("voiceInputLanguage = :voiceInputLanguage");
      expressionAttributeValues[":voiceInputLanguage"] =
        user.voiceInputLanguage;
    } else {
      removeParts.push("voiceInputLanguage");
    }

    const updateExpression = [
      `SET ${setParts.join(", ")}`,
      removeParts.length > 0 ? `REMOVE ${removeParts.join(", ")}` : undefined,
    ]
      .filter((part): part is string => part !== undefined)
      .join(" ");

    try {
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { id: user.id },
        UpdateExpression: updateExpression,
        ConditionExpression: "attribute_exists(id)",
        ExpressionAttributeValues: expressionAttributeValues,
      });

      await this.client.send(command);
    } catch (error) {
      console.error("Error updating user:", error);

      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        throw new RepositoryError("User not found", "NOT_FOUND");
      }

      throw new RepositoryError(
        "Failed to update user",
        "UPDATE_FAILED",
        error,
      );
    }
  }
}
