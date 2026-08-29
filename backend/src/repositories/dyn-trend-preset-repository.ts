import { DeleteCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { TrendPreset } from "../models/trend-preset";
import { RepositoryError } from "../ports/repository-error";
import { TrendPresetRepository } from "../ports/trend-preset-repository";
import { DynBaseRepository } from "./dyn-base-repository";
import { trendPresetDataSchema } from "./schemas/trend-preset";

export class DynTrendPresetRepository
  extends DynBaseRepository
  implements TrendPresetRepository
{
  async findManyByUserId(userId: string): Promise<TrendPreset[]> {
    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
    }

    try {
      const result = await this.paginateQuery({
        params: {
          TableName: this.tableName,
          KeyConditionExpression: "userId = :userId",
          ExpressionAttributeValues: {
            ":userId": userId,
          },
        },
        pageSize: undefined, // No pageSize = get all items
        schema: trendPresetDataSchema,
      });

      return result.items.map((data) => TrendPreset.fromPersistence(data));
    } catch (error) {
      console.error("Error finding trend presets by user ID:", error);
      throw new RepositoryError(
        "Failed to find trend presets",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async create(trendPreset: Readonly<TrendPreset>): Promise<void> {
    const data = trendPreset.toData();

    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: data,
        ConditionExpression: "attribute_not_exists(id)",
      });

      await this.client.send(command);
    } catch (error) {
      console.error("Error creating trend preset:", error);
      throw new RepositoryError(
        "Failed to create trend preset",
        "CREATE_FAILED",
        error,
      );
    }
  }

  async deleteOneById({
    id,
    userId,
  }: {
    id: string;
    userId: string;
  }): Promise<void> {
    if (!id) {
      throw new RepositoryError(
        "Trend preset ID is required",
        "INVALID_PARAMETERS",
      );
    }

    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
    }

    try {
      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: { userId, id },
      });

      await this.client.send(command);
    } catch (error) {
      console.error("Error deleting trend preset:", error);
      throw new RepositoryError(
        "Failed to delete trend preset",
        "DELETE_FAILED",
        error,
      );
    }
  }
}
