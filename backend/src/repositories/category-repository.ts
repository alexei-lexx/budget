import { randomUUID } from "crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchGetCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  Category,
  CategoryType,
  CreateCategoryInput,
  ICategoryRepository,
  UpdateCategoryInput,
} from "../models/category";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import { categorySchema } from "./schemas/category";
import { hydrate } from "./utils/hydrate";
import { paginateQuery } from "./utils/pagination";

/**
 * Repository error class for better error handling
 */
class CategoryRepositoryError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = "CategoryRepositoryError";
  }
}

export class CategoryRepository implements ICategoryRepository {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor(dynamoClient?: DynamoDBClient) {
    this.client = createDynamoDBDocumentClient(dynamoClient);
    this.tableName = process.env.CATEGORIES_TABLE_NAME || "";

    if (!this.tableName) {
      throw new CategoryRepositoryError(
        "CATEGORIES_TABLE_NAME environment variable is required",
        "MISSING_TABLE_NAME",
      );
    }
  }

  /**
   * Check if a category with the same name and type exists for the user among active categories
   */
  private async checkDuplicateName(
    userId: string,
    name: string,
    type: CategoryType,
    excludeId?: string,
  ): Promise<void> {
    try {
      const existingCategories = await this.findActiveByUserIdAndType(
        userId,
        type,
      );
      const duplicateCategory = existingCategories.find(
        (category) =>
          category.name.toLowerCase() === name.toLowerCase() &&
          category.id !== excludeId,
      );

      if (duplicateCategory) {
        throw new CategoryRepositoryError(
          `A ${type.toLowerCase()} category named "${name}" already exists`,
          "DUPLICATE_NAME",
        );
      }
    } catch (error) {
      if (error instanceof CategoryRepositoryError) {
        throw error;
      }
      throw new CategoryRepositoryError(
        "Failed to check for duplicate category names",
        "DUPLICATE_CHECK_FAILED",
        error,
      );
    }
  }

  async findActiveByUserId(userId: string): Promise<Category[]> {
    if (!userId) {
      throw new CategoryRepositoryError(
        "User ID is required",
        "INVALID_USER_ID",
      );
    }

    try {
      const result = await paginateQuery<Category>({
        client: this.client,
        params: {
          TableName: this.tableName,
          KeyConditionExpression: "userId = :userId",
          FilterExpression: "isArchived = :isArchived",
          ExpressionAttributeValues: {
            ":userId": userId,
            ":isArchived": false,
          },
        },
        options: {}, // No pageSize = get all items
        schema: categorySchema,
      });

      const categories = result.items;

      // Sort categories by type first, then by name (case-insensitive)
      return categories.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === CategoryType.INCOME ? -1 : 1; // INCOME first, then EXPENSE
        }
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });
    } catch (error) {
      console.error("Error finding active categories by user ID:", error);
      throw new CategoryRepositoryError(
        "Failed to find active categories",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async findActiveByUserIdAndType(
    userId: string,
    type: CategoryType,
  ): Promise<Category[]> {
    if (!userId) {
      throw new CategoryRepositoryError(
        "User ID is required",
        "INVALID_USER_ID",
      );
    }

    try {
      const result = await paginateQuery<Category>({
        client: this.client,
        params: {
          TableName: this.tableName,
          KeyConditionExpression: "userId = :userId",
          FilterExpression: "isArchived = :isArchived AND #type = :type",
          ExpressionAttributeNames: {
            "#type": "type",
          },
          ExpressionAttributeValues: {
            ":userId": userId,
            ":isArchived": false,
            ":type": type,
          },
        },
        options: {}, // No pageSize = get all items
        schema: categorySchema,
      });

      const categories = result.items;

      // Sort categories by name (case-insensitive)
      return categories.sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
      );
    } catch (error) {
      console.error(
        "Error finding active categories by user ID and type:",
        error,
      );
      throw new CategoryRepositoryError(
        "Failed to find active categories by type",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async findActiveById(id: string, userId: string): Promise<Category | null> {
    if (!id || !userId) {
      throw new CategoryRepositoryError(
        "Category ID and User ID are required",
        "INVALID_PARAMETERS",
      );
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
      throw new CategoryRepositoryError(
        "Failed to find category",
        "GET_FAILED",
        error,
      );
    }
  }

  async findByIds(ids: readonly string[], userId: string): Promise<Category[]> {
    if (ids.length === 0) {
      return [];
    }

    if (!userId) {
      throw new CategoryRepositoryError(
        "User ID is required",
        "INVALID_PARAMETERS",
      );
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
      throw new CategoryRepositoryError(
        "Failed to batch find categories",
        "BATCH_GET_FAILED",
        error,
      );
    }
  }

  async create(input: CreateCategoryInput): Promise<Category> {
    // Check for duplicate category names within the same type
    await this.checkDuplicateName(input.userId, input.name, input.type);

    const now = new Date().toISOString();
    const category: Category = {
      userId: input.userId,
      id: randomUUID(),
      name: input.name,
      type: input.type,
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
      throw new CategoryRepositoryError(
        "Failed to create category",
        "CREATE_FAILED",
        error,
      );
    }
  }

  async update(
    id: string,
    userId: string,
    input: UpdateCategoryInput,
  ): Promise<Category> {
    if (!id || !userId) {
      throw new CategoryRepositoryError(
        "Category ID and User ID are required",
        "INVALID_PARAMETERS",
      );
    }

    // Get current category to check for duplicate names
    const currentCategory = await this.findActiveById(id, userId);
    if (!currentCategory) {
      throw new CategoryRepositoryError("Category not found", "NOT_FOUND");
    }

    // Check for duplicate names if name or type is being updated
    if (input.name !== undefined || input.type !== undefined) {
      const newName =
        input.name !== undefined ? input.name : currentCategory.name;
      const newType =
        input.type !== undefined ? input.type : currentCategory.type;
      await this.checkDuplicateName(userId, newName, newType, id);
    }

    const now = new Date().toISOString();

    // Build update expression dynamically
    const updateExpressionParts: string[] = ["updatedAt = :updatedAt"];
    const expressionAttributeValues: Record<string, string> = {
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
        throw new CategoryRepositoryError(
          "Category not found or is archived",
          "NOT_FOUND",
        );
      }

      throw new CategoryRepositoryError(
        "Failed to update category",
        "UPDATE_FAILED",
        error,
      );
    }
  }

  async archive(id: string, userId: string): Promise<Category> {
    if (!id || !userId) {
      throw new CategoryRepositoryError(
        "Category ID and User ID are required",
        "INVALID_PARAMETERS",
      );
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
        throw new CategoryRepositoryError(
          "Category not found or already archived",
          "NOT_FOUND",
        );
      }

      throw new CategoryRepositoryError(
        "Failed to archive category",
        "ARCHIVE_FAILED",
        error,
      );
    }
  }
}

// Export the error class for use in resolvers
export { CategoryRepositoryError };
