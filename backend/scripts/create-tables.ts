#!/usr/bin/env ts-node

import {
  CreateTableCommand,
  CreateTableCommandInput,
  DescribeTableCommand,
  DynamoDBClient,
  ListTablesCommand,
} from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION ?? "",
  endpoint: process.env.DYNAMODB_ENDPOINT ?? "",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

const tables: CreateTableCommandInput[] = [
  {
    TableName: process.env.USERS_TABLE_NAME,
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
    TableName: process.env.ACCOUNTS_TABLE_NAME,
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
  {
    TableName: process.env.CATEGORIES_TABLE_NAME,
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
  {
    TableName: process.env.TRANSACTIONS_TABLE_NAME,
    AttributeDefinitions: [
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
      { AttributeName: "date", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "userId", KeyType: "HASH" },
      { AttributeName: "id", KeyType: "RANGE" },
    ],
    BillingMode: "PAY_PER_REQUEST",
    GlobalSecondaryIndexes: [
      {
        IndexName: "UserCreatedAtIndex",
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "UserDateIndex",
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" },
          { AttributeName: "date", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
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
