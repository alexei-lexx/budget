import { DeleteCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { StarredTrend } from "../models/starred-trend";
import { RepositoryError } from "../ports/repository-error";
import { StarredTrendRepository } from "../ports/starred-trend-repository";
import { DynBaseRepository } from "./dyn-base-repository";
import { starredTrendDataSchema } from "./schemas/starred-trend";

export class DynStarredTrendRepository
  extends DynBaseRepository
  implements StarredTrendRepository
{
  async findManyByUserId(userId: string): Promise<StarredTrend[]> {
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
        schema: starredTrendDataSchema,
      });

      return result.items.map((data) => StarredTrend.fromPersistence(data));
    } catch (error) {
      console.error("Error finding starred trends by user ID:", error);
      throw new RepositoryError(
        "Failed to find starred trends",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async create(starredTrend: Readonly<StarredTrend>): Promise<void> {
    const data = starredTrend.toData();

    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: data,
        ConditionExpression: "attribute_not_exists(id)",
      });

      await this.client.send(command);
    } catch (error) {
      console.error("Error creating starred trend:", error);
      throw new RepositoryError(
        "Failed to create starred trend",
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
        "Starred trend ID is required",
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
      console.error("Error deleting starred trend:", error);
      throw new RepositoryError(
        "Failed to delete starred trend",
        "DELETE_FAILED",
        error,
      );
    }
  }
}
