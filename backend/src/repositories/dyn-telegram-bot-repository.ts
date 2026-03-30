import { randomUUID } from "crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { TelegramBot, TelegramBotStatus } from "../models/telegram-bot";
import { RepositoryError } from "../services/ports/repository-error";
import {
  CreateTelegramBotInput,
  TelegramBotRepository,
  UpdateTelegramBotInput,
} from "../services/ports/telegram-bot-repository";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import { telegramBotSchema } from "./schemas/telegram-bot";
import { hydrate } from "./utils/hydrate";

export class DynTelegramBotRepository implements TelegramBotRepository {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor(dynamoClient?: DynamoDBClient) {
    this.client = createDynamoDBDocumentClient(dynamoClient);
    this.tableName = process.env.TELEGRAM_BOTS_TABLE_NAME || "";

    if (!this.tableName) {
      throw new RepositoryError(
        "TELEGRAM_BOTS_TABLE_NAME environment variable is required",
        "MISSING_TABLE_NAME",
      );
    }
  }

  async findOneConnectedByUserId(userId: string): Promise<TelegramBot | null> {
    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
    }

    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "userId = :userId",
        FilterExpression: "#status = :status AND isArchived = :isArchived",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":userId": userId,
          ":status": TelegramBotStatus.CONNECTED,
          ":isArchived": false,
        },
      });

      const result = await this.client.send(command);

      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      if (result.Items.length > 1) {
        throw new RepositoryError(
          "Multiple connected bots found for user",
          "INTEGRITY_ERROR",
        );
      }

      return hydrate(telegramBotSchema, result.Items[0]);
    } catch (error) {
      console.error("Error finding telegram bot by userId:", error);

      if (error instanceof RepositoryError) {
        throw error;
      }

      throw new RepositoryError(
        "Failed to find telegram bot by userId",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async findOneConnectedByWebhookSecret(
    webhookSecret: string,
  ): Promise<TelegramBot | null> {
    if (!webhookSecret) {
      throw new RepositoryError(
        "Webhook secret is required",
        "INVALID_PARAMETERS",
      );
    }

    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: "WebhookSecretIndex",
        KeyConditionExpression: "webhookSecret = :webhookSecret",
        FilterExpression: "#status = :status AND isArchived = :isArchived",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":webhookSecret": webhookSecret,
          ":status": TelegramBotStatus.CONNECTED,
          ":isArchived": false,
        },
      });

      const result = await this.client.send(command);

      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      if (result.Items.length > 1) {
        throw new RepositoryError(
          "Multiple connected bots found for webhook secret",
          "INTEGRITY_ERROR",
        );
      }

      return hydrate(telegramBotSchema, result.Items[0]);
    } catch (error) {
      console.error("Error finding telegram bot by webhookSecret:", error);

      if (error instanceof RepositoryError) {
        throw error;
      }

      throw new RepositoryError(
        "Failed to find telegram bot by webhookSecret",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async create(input: CreateTelegramBotInput): Promise<TelegramBot> {
    const now = new Date().toISOString();
    const bot: TelegramBot = {
      id: randomUUID(),
      userId: input.userId,
      token: input.token,
      webhookSecret: input.webhookSecret,
      status: input.status,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: bot,
      });

      await this.client.send(command);
      return bot;
    } catch (error) {
      console.error("Error creating telegram bot:", error);
      throw new RepositoryError(
        "Failed to create telegram bot",
        "CREATE_FAILED",
        error,
      );
    }
  }

  async update(
    { id, userId }: { id: string; userId: string },
    input: UpdateTelegramBotInput,
  ): Promise<TelegramBot> {
    if (!id) {
      throw new RepositoryError(
        "Telegram bot ID is required",
        "INVALID_PARAMETERS",
      );
    }

    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
    }

    const now = new Date().toISOString();

    const updateExpressionParts: string[] = ["updatedAt = :updatedAt"];
    const expressionAttributeValues: Record<string, unknown> = {
      ":updatedAt": now,
      ":isArchived": true,
    };
    const expressionAttributeNames: Record<string, string> = {};

    if (input.status !== undefined) {
      updateExpressionParts.push("#status = :status");
      expressionAttributeValues[":status"] = input.status;
      expressionAttributeNames["#status"] = "status";
    }

    try {
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { userId, id },
        UpdateExpression: `SET ${updateExpressionParts.join(", ")}`,
        ConditionExpression:
          "attribute_exists(userId) AND attribute_exists(id) AND isArchived <> :isArchived",
        ...(Object.keys(expressionAttributeNames).length > 0 && {
          ExpressionAttributeNames: expressionAttributeNames,
        }),
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "ALL_NEW",
      });

      const result = await this.client.send(command);
      return hydrate(telegramBotSchema, result.Attributes);
    } catch (error) {
      console.error("Error updating telegram bot:", error);

      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        throw new RepositoryError(
          "Telegram bot not found or is archived",
          "NOT_FOUND",
        );
      }

      throw new RepositoryError(
        "Failed to update telegram bot",
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
  }): Promise<TelegramBot> {
    if (!id) {
      throw new RepositoryError(
        "Telegram bot ID is required",
        "INVALID_PARAMETERS",
      );
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
      return hydrate(telegramBotSchema, result.Attributes);
    } catch (error) {
      console.error("Error archiving telegram bot:", error);

      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        throw new RepositoryError(
          "Telegram bot not found or already archived",
          "NOT_FOUND",
        );
      }

      throw new RepositoryError(
        "Failed to archive telegram bot",
        "ARCHIVE_FAILED",
        error,
      );
    }
  }
}
