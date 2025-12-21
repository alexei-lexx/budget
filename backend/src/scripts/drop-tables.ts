#!/usr/bin/env ts-node

import {
  DeleteTableCommand,
  ListTablesCommand,
} from "@aws-sdk/client-dynamodb";
import { createDynamoDBClient } from "../utils/dynamo-client";
import { tableExists, tables } from "./table-definitions";

const client = createDynamoDBClient();

async function waitForTableDeletion(
  tableName: string,
  maxWaitTimeMs = 30000,
): Promise<void> {
  const startTime = Date.now();
  const pollInterval = 1000;

  while (Date.now() - startTime < maxWaitTimeMs) {
    if (!(await tableExists(client, tableName))) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(
    `Table ${tableName} deletion timed out after ${maxWaitTimeMs}ms`,
  );
}

async function dropTables() {
  console.log("Dropping tables...");

  for (const table of tables) {
    if (!table.TableName) {
      console.error("Table definition missing TableName property.");
      continue;
    }

    if (!(await tableExists(client, table.TableName))) {
      console.log(`${table.TableName} does not exist (skipping)`);
      continue;
    }

    try {
      console.log(`Deleting ${table.TableName}...`);
      await client.send(new DeleteTableCommand({ TableName: table.TableName }));
      await waitForTableDeletion(table.TableName);
      console.log(`Deleted ${table.TableName}`);
    } catch (error) {
      console.error(`Failed to delete ${table.TableName}:`, error);
      throw error;
    }
  }

  console.log("Done!");
}

async function main() {
  try {
    await client.send(new ListTablesCommand({}));
    await dropTables();
  } catch (error: unknown) {
    console.error("DynamoDB connection failed:", error);
    console.log("Make sure DynamoDB Local is running: npm run db:start");
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
