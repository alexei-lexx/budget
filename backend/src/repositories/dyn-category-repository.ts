import { randomUUID } from "crypto";
import {
  BatchGetCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Category, CategoryType } from "../models/category";
import {
  CategoryRepository,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../ports/category-repository";
import { RepositoryError } from "../ports/repository-error";
import { DynBaseRepository } from "./dyn-base-repository";
import { categorySchema } from "./schemas/category";
import { hydrate } from "./utils/hydrate";
import { paginateQuery } from "./utils/query";

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

      const category = hydrate(categorySchema, result.Item);

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

      const result = await paginateQuery<Category>({
        client: this.client,
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
        schema: categorySchema,
      });

      return sortCategories(result.items);
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
      const result = await paginateQuery<Category>({
        client: this.client,
        params: {
          TableName: this.tableName,
          KeyConditionExpression: "userId = :userId",
          ExpressionAttributeValues: {
            ":userId": userId,
          },
        },
        pageSize: undefined, // No pageSize = get all items
        schema: categorySchema,
      });

      return result.items;
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
        hydrate(categorySchema, item),
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

  async create(input: CreateCategoryInput): Promise<Category> {
    const now = new Date().toISOString();
    const category: Category = {
      userId: input.userId,
      id: randomUUID(),
      name: input.name,
      type: input.type,
      excludeFromReports: input.excludeFromReports,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: category,
      });

      await this.client.send(command);
      return category;
    } catch (error) {
      console.error("Error creating category:", error);
      throw new RepositoryError(
        "Failed to create category",
        "CREATE_FAILED",
        error,
      );
    }
  }

  async update(
    { id, userId }: { id: string; userId: string },
    input: UpdateCategoryInput,
  ): Promise<Category> {
    if (!id) {
      throw new RepositoryError(
        "Category ID is required",
        "INVALID_PARAMETERS",
      );
    }

    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
    }

    // Get current category to check for duplicate names
    const currentCategory = await this.findOneById({ id, userId });
    if (!currentCategory) {
      throw new RepositoryError("Category not found", "NOT_FOUND");
    }

    const now = new Date().toISOString();

    // Build update expression dynamically
    const updateExpressionParts: string[] = ["updatedAt = :updatedAt"];
    const expressionAttributeValues: Record<string, string | boolean> = {
      ":updatedAt": now,
    };
    const expressionAttributeNames: Record<string, string> = {};

    if (input.name !== undefined) {
      updateExpressionParts.push("#name = :name");
      expressionAttributeValues[":name"] = input.name.trim();
      expressionAttributeNames["#name"] = "name";
    }

    if (input.type !== undefined) {
      updateExpressionParts.push("#type = :type");
      expressionAttributeValues[":type"] = input.type;
      expressionAttributeNames["#type"] = "type";
    }

    if (input.excludeFromReports !== undefined) {
      updateExpressionParts.push("excludeFromReports = :excludeFromReports");
      expressionAttributeValues[":excludeFromReports"] =
        input.excludeFromReports;
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
        ExpressionAttributeValues: {
          ...expressionAttributeValues,
          ":isArchived": true,
        },
        ReturnValues: "ALL_NEW",
      });

      const result = await this.client.send(command);
      return hydrate(categorySchema, result.Attributes);
    } catch (error) {
      console.error("Error updating category:", error);

      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        throw new RepositoryError(
          "Category not found or is archived",
          "NOT_FOUND",
        );
      }

      throw new RepositoryError(
        "Failed to update category",
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
  }): Promise<Category> {
    if (!id) {
      throw new RepositoryError(
        "Category ID is required",
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
      return hydrate(categorySchema, result.Attributes);
    } catch (error) {
      console.error("Error archiving category:", error);

      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        throw new RepositoryError(
          "Category not found or already archived",
          "NOT_FOUND",
        );
      }

      throw new RepositoryError(
        "Failed to archive category",
        "ARCHIVE_FAILED",
        error,
      );
    }
  }
}
