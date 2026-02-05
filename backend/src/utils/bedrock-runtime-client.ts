import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { parseFloatEnv, parseIntEnv, requireEnv } from "./require-env";

const isLocalEnvironment =
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

/** Reads the Bedrock model identifier from AWS_BEDROCK_MODEL_ID. */
export function loadBedrockModelId(): string {
  return requireEnv("AWS_BEDROCK_MODEL_ID");
}

/** Reads the max response tokens from AWS_BEDROCK_MAX_TOKENS. */
export function loadBedrockMaxTokens(): number {
  return parseIntEnv(
    "AWS_BEDROCK_MAX_TOKENS",
    requireEnv("AWS_BEDROCK_MAX_TOKENS"),
  );
}

/** Reads the sampling temperature from AWS_BEDROCK_TEMPERATURE. */
export function loadBedrockTemperature(): number {
  return parseFloatEnv(
    "AWS_BEDROCK_TEMPERATURE",
    requireEnv("AWS_BEDROCK_TEMPERATURE"),
  );
}

/**
 * Creates a Bedrock runtime client.
 * - Local: authenticates via a long-term Bedrock API key (AWS_BEARER_TOKEN_BEDROCK).
 * - Production: authenticates via the Lambda execution role (IAM/SigV4).
 */
export function createBedrockRuntimeClient(): BedrockRuntimeClient {
  const config = isLocalEnvironment
    ? { token: { token: requireEnv("AWS_BEARER_TOKEN_BEDROCK") } }
    : {};

  return new BedrockRuntimeClient(config);
}
