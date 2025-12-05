import { runMigrations } from "../migrations/runner";
import { createDynamoDBClient } from "../repositories/utils/dynamoClient";

/**
 * Local migration script
 *
 * Runs migrations against local DynamoDB instance.
 * Follows the same pattern as scripts/create-tables.ts for client configuration.
 *
 * Usage: npm run migrate
 */
async function main(): Promise<void> {
  const client = createDynamoDBClient();

  try {
    const stats = await runMigrations(client);

    if (stats.failed > 0) {
      console.error("\nMigrations failed");
      process.exit(1);
    }

    console.log("\nMigrations completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("\nMigration error:", error);
    process.exit(1);
  }
}

main();
