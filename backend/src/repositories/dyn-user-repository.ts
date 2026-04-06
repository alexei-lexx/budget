import { randomUUID } from "crypto";
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { User } from "../models/user";
import { RepositoryError } from "../services/ports/repository-error";
import {
  CreateUserInput,
  UpdateUserInput,
  UserRepository,
} from "../services/ports/user-repository";
import { normalizeEmail } from "../utils/email";
import { DynBaseRepository } from "./dyn-base-repository";
import { userSchema } from "./schemas/user";
import { hydrate } from "./utils/hydrate";

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

      return hydrate(userSchema, result.Items[0]);
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

      return hydrate(userSchema, result.Item);
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

      return result.Items.map((item) => hydrate(userSchema, item));
    } catch (error) {
      console.error("Error finding all users:", error);
      throw new RepositoryError("Failed to find users", "QUERY_FAILED", error);
    }
  }

  async create(input: CreateUserInput): Promise<User> {
    const now = new Date().toISOString();
    const user: User = {
      id: randomUUID(),
      email: normalizeEmail(input.email),
      createdAt: now,
      updatedAt: now,
    };

    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: user,
      });

      await this.client.send(command);
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw new RepositoryError(
        "Failed to create user",
        "CREATE_FAILED",
        error,
      );
    }
  }

  async ensureUser(email: string): Promise<User> {
    // Check if user exists
    const existingUser = await this.findOneByEmail(email);

    if (existingUser) {
      return existingUser;
    }

    // Create new user if doesn't exist
    return this.create({
      email,
    });
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    if (!id) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
    }

    const now = new Date().toISOString();

    // Build SET expression dynamically — only include fields that were provided
    const updateExpressionParts: string[] = ["updatedAt = :updatedAt"];
    const expressionAttributeValues: Record<string, string | number> = {
      ":updatedAt": now,
    };

    if (input.transactionPatternsLimit !== undefined) {
      updateExpressionParts.push(
        "transactionPatternsLimit = :transactionPatternsLimit",
      );
      expressionAttributeValues[":transactionPatternsLimit"] =
        input.transactionPatternsLimit;
    }

    if (input.voiceInputLanguage !== undefined) {
      updateExpressionParts.push("voiceInputLanguage = :voiceInputLanguage");
      expressionAttributeValues[":voiceInputLanguage"] =
        input.voiceInputLanguage;
    }

    try {
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { id },
        UpdateExpression: `SET ${updateExpressionParts.join(", ")}`,
        ConditionExpression: "attribute_exists(id)",
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "ALL_NEW",
      });

      const result = await this.client.send(command);
      return hydrate(userSchema, result.Attributes);
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
