import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { TelegramBot } from "../models/telegram-bot";
import { RepositoryError } from "../ports/repository-error";
import { TelegramBotRepository } from "../ports/telegram-bot-repository";
import { DynBaseRepository } from "./dyn-base-repository";
import { telegramBotSchema } from "./schemas/telegram-bot";

export class DynTelegramBotRepository
  extends DynBaseRepository
  implements TelegramBotRepository
{
  async findOneConnectedByUserId(userId: string): Promise<TelegramBot | null> {
    if (!userId) {
      throw new RepositoryError("User ID is required");
    }

    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "userId = :userId",
        FilterExpression: "#status = :status AND isArchived = :isArchived",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":userId": userId,
          ":status": "CONNECTED",
          ":isArchived": false,
        },
      });

      const result = await this.client.send(command);

      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      if (result.Items.length > 1) {
        throw new RepositoryError("Multiple connected bots found for user");
      }

      return TelegramBot.fromPersistence(
        this.hydrate(telegramBotSchema, result.Items[0]),
      );
    } catch (error) {
      console.error("Error finding telegram bot by userId:", error);

      if (error instanceof RepositoryError) {
        throw error;
      }

      throw new RepositoryError("Failed to find telegram bot by userId", error);
    }
  }

  async findOneConnectedByWebhookSecret(
    webhookSecret: string,
  ): Promise<TelegramBot | null> {
    if (!webhookSecret) {
      throw new RepositoryError("Webhook secret is required");
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
          ":status": "CONNECTED",
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
        );
      }

      return TelegramBot.fromPersistence(
        this.hydrate(telegramBotSchema, result.Items[0]),
      );
    } catch (error) {
      console.error("Error finding telegram bot by webhookSecret:", error);

      if (error instanceof RepositoryError) {
        throw error;
      }

      throw new RepositoryError(
        "Failed to find telegram bot by webhookSecret",
        error,
      );
    }
  }

  async create(bot: Readonly<TelegramBot>): Promise<void> {
    const data = bot.toData();

    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: data,
        ConditionExpression: "attribute_not_exists(id)",
      });

      await this.client.send(command);
    } catch (error) {
      console.error("Error creating telegram bot:", error);
      throw new RepositoryError("Failed to create telegram bot", error);
    }
  }

  async update(bot: Readonly<TelegramBot>): Promise<TelegramBot> {
    try {
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { userId: bot.userId, id: bot.id },
        UpdateExpression:
          "SET #token = :token, webhookSecret = :webhookSecret, #status = :status, isArchived = :isArchived, updatedAt = :updatedAt",
        ConditionExpression:
          "attribute_exists(userId) AND attribute_exists(id) AND isArchived <> :alreadyArchived",
        ExpressionAttributeNames: { "#token": "token", "#status": "status" },
        ExpressionAttributeValues: {
          ":token": bot.token,
          ":webhookSecret": bot.webhookSecret,
          ":status": bot.status,
          ":isArchived": bot.isArchived,
          ":updatedAt": bot.updatedAt,
          ":alreadyArchived": true,
        },
        ReturnValues: "ALL_NEW",
      });

      const result = await this.client.send(command);
      return TelegramBot.fromPersistence(
        this.hydrate(telegramBotSchema, result.Attributes),
      );
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        throw new RepositoryError(
          "Telegram bot not found or is archived",
          error,
        );
      }

      console.error("Error updating telegram bot:", error);
      throw new RepositoryError("Failed to update telegram bot", error);
    }
  }
}
