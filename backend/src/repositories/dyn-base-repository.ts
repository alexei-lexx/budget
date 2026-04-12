import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { RepositoryError } from "../ports/repository-error";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";

export abstract class DynBaseRepository {
  protected readonly client: DynamoDBDocumentClient;
  protected readonly tableName: string;

  constructor(tableName: string, dynamoClient?: DynamoDBClient) {
    if (!tableName) {
      throw new RepositoryError("tableName is required", "MISSING_TABLE_NAME");
    }

    this.client = createDynamoDBDocumentClient(dynamoClient);
    this.tableName = tableName;
  }
}
