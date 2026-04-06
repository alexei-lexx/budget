#!/usr/bin/env ts-node

import {
  CreateTableCommand,
  ListTablesCommand,
  UpdateTimeToLiveCommand,
} from "@aws-sdk/client-dynamodb";
import { createDynamoDBClient } from "../utils/dynamo-client";
import { tableExists, tables } from "./table-definitions";

const client = createDynamoDBClient();

async function createTables() {
  console.log("Creating tables...");

  for (const table of tables) {
    if (table.TableName && (await tableExists(client, table.TableName))) {
      console.log(`${table.TableName} already exists`);
    } else if (table.TableName) {
      await client.send(new CreateTableCommand(table));
      console.log(`Created ${table.TableName}`);

      if (table.ttlAttribute) {
        await client.send(
          new UpdateTimeToLiveCommand({
            TableName: table.TableName,
            TimeToLiveSpecification: {
              AttributeName: table.ttlAttribute,
              Enabled: true,
            },
          }),
        );
        console.log(
          `Enabled TTL on ${table.TableName} (${table.ttlAttribute})`,
        );
      }
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
