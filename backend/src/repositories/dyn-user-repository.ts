import { randomUUID } from "crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { User } from "../models/user";
import {
  CreateUserInput,
  UserRepository,
} from "../services/ports/user-repository";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import { normalizeEmail } from "../utils/email";
import { userSchema } from "./schemas/user";
import { hydrate } from "./utils/hydrate";

export class DynUserRepository implements UserRepository {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor(dynamoClient?: DynamoDBClient) {
    this.client = createDynamoDBDocumentClient(dynamoClient);
    this.tableName = process.env.USERS_TABLE_NAME || "";

    if (!this.tableName) {
      throw new Error("USERS_TABLE_NAME environment variable is required");
    }
  }

  async findByEmail(email: string): Promise<User | null> {
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
        throw new Error(
          `Data integrity error: Multiple users found for email ${normalizedEmail}`,
        );
      }

      return hydrate(userSchema, result.Items[0]);
    } catch (error) {
      console.error("Error finding user by email:", error);
      throw new Error("Failed to find user by email");
    }
  }

  async findAll(): Promise<User[]> {
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
      throw new Error("Failed to find users");
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
      throw new Error("Failed to create user");
    }
  }

  async ensureUser(email: string): Promise<User> {
    // Check if user exists
    const existingUser = await this.findByEmail(email);

    if (existingUser) {
      return existingUser;
    }

    // Create new user if doesn't exist
    return this.create({
      email,
    });
  }
}
