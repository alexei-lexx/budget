#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const client_dynamodb_2 = require("@aws-sdk/client-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({
    region: "us-east-1",
    endpoint: "http://localhost:8000",
    credentials: {
        accessKeyId: "dummy",
        secretAccessKey: "dummy",
    },
});
const tables = [
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
];
async function tableExists(tableName) {
    try {
        await client.send(new client_dynamodb_2.DescribeTableCommand({ TableName: tableName }));
        return true;
    }
    catch (error) {
        if (typeof error === "object" && error !== null && "name" in error) {
            return error.name !== "ResourceNotFoundException";
        }
        return false;
    }
}
async function createTables() {
    console.log("Creating tables...");
    for (const table of tables) {
        if (table.TableName && (await tableExists(table.TableName))) {
            console.log(`${table.TableName} already exists`);
        }
        else if (table.TableName) {
            await client.send(new client_dynamodb_2.CreateTableCommand(table));
            console.log(`Created ${table.TableName}`);
        }
        else {
            console.error("Table definition missing TableName property.");
        }
    }
    console.log("Done!");
}
async function main() {
    try {
        await client.send(new client_dynamodb_2.ListTablesCommand({}));
        await createTables();
    }
    catch (error) {
        console.error("DynamoDB connection failed:", error);
        console.log("Make sure DynamoDB Local is running: npm run db:start");
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}
