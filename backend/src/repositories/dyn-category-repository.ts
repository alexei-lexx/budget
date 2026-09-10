import {
  BatchGetCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Category, CategoryType } from "../models/category";
import { CategoryRepository } from "../ports/category-repository";
import { RepositoryError } from "../ports/repository-error";
import { DynBaseRepository } from "./dyn-base-repository";
import { categoryDataSchema } from "./schemas/category";

/**
 * Sort categories alphabetically by name
 */
function sortCategories(categories: Category[]): Category[] {
  return categories.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

export class DynCategoryRepository
  extends DynBaseRepository
  implements CategoryRepository
{
  async findOneById({
    id,
    userId,
  }: {
    id: string;
    userId: string;
  }): Promise<Category | null> {
    if (!id) {
      throw new RepositoryError(
        "Category ID is required",
        "INVALID_PARAMETERS",
      );
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

      const data = this.hydrate(categoryDataSchema, result.Item);
      const category = Category.fromPersistence(data);

      // Return null if category is archived (soft deleted)
      if (category.isArchived) {
        return null;
      }

      return category;
    } catch (error) {
      console.error("Error finding category by ID:", error);
      throw new RepositoryError("Failed to find category", "GET_FAILED", error);
    }
  }

  async findManyByUserId(
    userId: string,
    filters?: { type?: CategoryType },
  ): Promise<Category[]> {
    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
    }

    try {
      const filterParts = ["isArchived = :isArchived"];
      const expressionAttributeValues: Record<string, string | boolean> = {
        ":userId": userId,
        ":isArchived": false,
      };
      const expressionAttributeNames: Record<string, string> = {};

      if (filters?.type) {
        filterParts.push("#type = :type");
        expressionAttributeValues[":type"] = filters.type;
        expressionAttributeNames["#type"] = "type";
      }

      const result = await this.paginateQuery({
        params: {
          TableName: this.tableName,
          KeyConditionExpression: "userId = :userId",
          FilterExpression: filterParts.join(" AND "),
          ExpressionAttributeValues: expressionAttributeValues,
          ...(Object.keys(expressionAttributeNames).length > 0 && {
            ExpressionAttributeNames: expressionAttributeNames,
          }),
        },
        pageSize: undefined, // No pageSize = get all items
        schema: categoryDataSchema,
      });

      const categories = result.items.map((data) =>
        Category.fromPersistence(data),
      );

      return sortCategories(categories);
    } catch (error) {
      console.error("Error finding active categories by user ID:", error);
      throw new RepositoryError(
        "Failed to find active categories",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async findManyWithArchivedByUserId(userId: string): Promise<Category[]> {
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
        schema: categoryDataSchema,
      });

      return result.items.map((data) => Category.fromPersistence(data));
    } catch (error) {
      console.error("Error finding all categories by user ID:", error);
      throw new RepositoryError(
        "Failed to find all categories",
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
  }): Promise<Category[]> {
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
        Category.fromPersistence(this.hydrate(categoryDataSchema, item)),
      );
    } catch (error) {
      console.error("Error batch finding categories by IDs:", error);
      throw new RepositoryError(
        "Failed to batch find categories",
        "BATCH_GET_FAILED",
        error,
      );
    }
  }

  async create(category: Readonly<Category>): Promise<void> {
    const data = category.toData();

    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: data,
        ConditionExpression: "attribute_not_exists(id)",
      });

      await this.client.send(command);
    } catch (error) {
      console.error("Error creating category:", error);
      throw new RepositoryError(
        "Failed to create category",
        "CREATE_FAILED",
        error,
      );
    }
  }

  async update(category: Readonly<Category>): Promise<Category> {
    const data = category.toData();

    try {
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { userId: data.userId, id: data.id },
        UpdateExpression:
          "SET #name = :name, #type = :type, excludeFromReports = :excludeFromReports, " +
          "isArchived = :isArchived, updatedAt = :updatedAt",
        ConditionExpression:
          "attribute_exists(userId) AND attribute_exists(id) AND isArchived <> :true",
        ExpressionAttributeNames: { "#name": "name", "#type": "type" },
        ExpressionAttributeValues: {
          ":name": data.name,
          ":type": data.type,
          ":excludeFromReports": data.excludeFromReports,
          ":isArchived": data.isArchived,
          ":updatedAt": data.updatedAt,
          ":true": true,
        },
      });

      await this.client.send(command);
      return category;
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        throw new RepositoryError(
          "Category not found or already archived",
          "NOT_FOUND",
        );
      }

      console.error("Error updating category:", error);
      throw new RepositoryError(
        "Failed to update category",
        "UPDATE_FAILED",
        error,
      );
    }
  }
}
