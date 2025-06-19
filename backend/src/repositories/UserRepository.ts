import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { User, CreateUserInput, IUserRepository } from "../models/User.js";

export class UserRepository implements IUserRepository {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor(dynamoClient?: DynamoDBClient) {
    const client =
      dynamoClient ||
      new DynamoDBClient({
        region: process.env.AWS_REGION || "us-east-1",
      });
    this.client = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.USERS_TABLE_NAME || "Users";
  }

  async findByAuth0UserId(auth0UserId: string): Promise<User | null> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: "Auth0UserIdIndex",
        KeyConditionExpression: "auth0UserId = :auth0UserId",
        ExpressionAttributeValues: {
          ":auth0UserId": auth0UserId,
        },
      });

      const result = await this.client.send(command);

      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      if (result.Items.length > 1) {
        throw new Error(
          `Data integrity error: Multiple users found for Auth0 ID ${auth0UserId}`,
        );
      }

      return result.Items[0] as User;
    } catch (error) {
      console.error("Error finding user by Auth0 ID:", error);
      throw new Error("Failed to find user");
    }
  }

  async create(input: CreateUserInput): Promise<User> {
    const now = new Date().toISOString();
    const user: User = {
      id: randomUUID(),
      auth0UserId: input.auth0UserId,
      email: input.email.toLowerCase(),
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

  async ensureUser(auth0UserId: string, email: string): Promise<User> {
    // Check if user exists
    const existingUser = await this.findByAuth0UserId(auth0UserId);

    if (existingUser) {
      return existingUser;
    }

    // Create new user if doesn't exist
    return this.create({
      auth0UserId,
      email,
    });
  }
}
