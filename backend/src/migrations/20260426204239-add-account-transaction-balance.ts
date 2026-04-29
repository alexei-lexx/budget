import {
  ConditionalCheckFailedException,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { requireEnv } from "../utils/require-env";

/**
 * Backfills `transactionBalance` on every Account row.
 * For each account, sums signedAmount over its non-archived transactions.
 * Idempotent: `attribute_not_exists(transactionBalance)` guards against re-application.
 * Must run before code that requires `transactionBalance` on reads is deployed.
 */

// Type→sign mapping inlined; frozen at migration time.
const POSITIVE_TYPES = new Set(["INCOME", "REFUND", "TRANSFER_IN"]);

function signedAmount(type: string, amount: number): number {
  return POSITIVE_TYPES.has(type) ? amount : -amount;
}

export async function up(client: DynamoDBClient): Promise<void> {
  const accountsTable = requireEnv("ACCOUNTS_TABLE_NAME");
  const transactionsTable = requireEnv("TRANSACTIONS_TABLE_NAME");
  const docClient = DynamoDBDocumentClient.from(client);

  let scannedAccounts = 0;
  let backfilledAccounts = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  console.log("Starting migration: backfilling transactionBalance on accounts");

  do {
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: accountsTable,
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );

    const accounts = scanResult.Items ?? [];
    scannedAccounts += accounts.length;

    for (const account of accounts) {
      // Sum signedAmount of non-archived transactions for this account.
      let signedAmountSum = 0;
      let transactionsLastEvaluatedKey: Record<string, unknown> | undefined;
      do {
        const transactionsQueryResult = await docClient.send(
          new QueryCommand({
            TableName: transactionsTable,
            KeyConditionExpression: "userId = :userId",
            FilterExpression:
              "accountId = :accountId AND isArchived = :isArchived",
            ExpressionAttributeValues: {
              ":userId": account.userId,
              ":accountId": account.id,
              ":isArchived": false,
            },
            ExclusiveStartKey: transactionsLastEvaluatedKey,
          }),
        );
        for (const transaction of transactionsQueryResult.Items ?? []) {
          signedAmountSum += signedAmount(
            transaction.type as string,
            transaction.amount as number,
          );
        }
        transactionsLastEvaluatedKey = transactionsQueryResult.LastEvaluatedKey;
      } while (transactionsLastEvaluatedKey);

      try {
        await docClient.send(
          new UpdateCommand({
            TableName: accountsTable,
            Key: { userId: account.userId, id: account.id },
            UpdateExpression: "SET transactionBalance = :transactionBalance",
            ConditionExpression: "attribute_not_exists(transactionBalance)",
            ExpressionAttributeValues: {
              ":transactionBalance": signedAmountSum,
            },
          }),
        );
        backfilledAccounts++;
      } catch (error) {
        if (error instanceof ConditionalCheckFailedException) continue;
        throw error;
      }
    }

    lastEvaluatedKey = scanResult.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(
    `Migration completed: scanned ${scannedAccounts} accounts, backfilled ${backfilledAccounts}`,
  );
}
