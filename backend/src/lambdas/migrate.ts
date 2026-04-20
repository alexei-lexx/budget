import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import { runMigrations } from "../migrations/runner";
import { createSingleton } from "../utils/dependency-injection";
import { injectRuntimeEnv } from "./bootstrap";

// Handler runs per invocation; cache so warm-start invocations skip the SSM fetch.
const ensureRuntimeEnv = createSingleton(() => injectRuntimeEnv(process.env));

/**
 * Lambda handler for production migrations
 *
 * Executes migrations automatically during deployment.
 * Invoked synchronously by deploy.sh.
 *
 * Returns statistics on success or throws error on failure.
 */

const client = new DynamoDBClient({});

export const handler: Handler = async () => {
  try {
    console.log("Lambda migration handler invoked");

    await ensureRuntimeEnv();

    const stats = await runMigrations(client);

    console.log("Migrations completed successfully");

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Migrations completed",
        executed: stats.executed,
        skipped: stats.skipped,
        failed: stats.failed,
        totalDurationMs: stats.totalDurationMs,
      }),
    };
  } catch (error) {
    console.error("Migration failed:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Migration failed",
        error: (error as Error).message,
      }),
    };
  }
};
