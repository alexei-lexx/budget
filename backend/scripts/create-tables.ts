#!/usr/bin/env ts-node

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  CreateTableCommand,
  DescribeTableCommand,
  ListTablesCommand,
  CreateTableCommandInput,
} from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: "us-east-1",
  endpoint: "http://localhost:8000",
  credentials: {
    accessKeyId: "dummy",
    secretAccessKey: "dummy",
  },
});

const tables: CreateTableCommandInput[] = [
  {
    TableName: "Users",
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "auth0UserId", AttributeType: "S" },
    ],
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    BillingMode: "PAY_PER_REQUEST",
    GlobalSecondaryIndexes: [
      {
        IndexName: "Auth0UserIdIndex",
        KeySchema: [{ AttributeName: "auth0UserId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ],
  },
  {
    TableName: "Accounts",
    AttributeDefinitions: [
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "id", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "userId", KeyType: "HASH" },
      { AttributeName: "id", KeyType: "RANGE" },
    ],
    BillingMode: "PAY_PER_REQUEST",
  },
];

async function tableExists(tableName: string): Promise<boolean> {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (error) {
    if (typeof error === "object" && error !== null && "name" in error) {
      return (error as { name: string }).name !== "ResourceNotFoundException";
    }
    return false;
  }
}

async function createTables() {
  console.log("Creating tables...");

  for (const table of tables) {
    if (table.TableName && (await tableExists(table.TableName))) {
      console.log(`${table.TableName} already exists`);
    } else if (table.TableName) {
      await client.send(new CreateTableCommand(table));
      console.log(`Created ${table.TableName}`);
    } else {
      console.error("Table definition missing TableName property.");
    }
  }

  console.log("Done!");
}

async function main() {
  try {
    await client.send(new ListTablesCommand({}));
    await createTables();
  } catch (error: unknown) {
    console.error("DynamoDB connection failed:", error);
    console.log("Make sure DynamoDB Local is running: npm run db:start");
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
