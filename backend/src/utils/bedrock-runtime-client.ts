import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

const isLocalEnvironment =
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

function parseIntEnv(name: string, value: string): number {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`${name} must be a valid integer`);
  }
  return parsed;
}

function parseFloatEnv(name: string, value: string): number {
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${name} must be a valid number`);
  }
  return parsed;
}

export function loadBedrockModelId(): string {
  return requireEnv("AWS_BEDROCK_MODEL_ID");
}

export function loadBedrockMaxTokens(): number {
  return parseIntEnv(
    "AWS_BEDROCK_MAX_TOKENS",
    requireEnv("AWS_BEDROCK_MAX_TOKENS"),
  );
}

export function loadBedrockTemperature(): number {
  return parseFloatEnv(
    "AWS_BEDROCK_TEMPERATURE",
    requireEnv("AWS_BEDROCK_TEMPERATURE"),
  );
}

export function createBedrockRuntimeClient(): BedrockRuntimeClient {
  const bearerToken = process.env.AWS_BEARER_TOKEN_BEDROCK;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  const localCredentials = bearerToken
    ? {
        accessKeyId: accessKeyId || "bedrock",
        secretAccessKey: secretAccessKey || "bedrock",
        sessionToken: bearerToken,
      }
    : accessKeyId && secretAccessKey
      ? {
          accessKeyId,
          secretAccessKey,
        }
      : undefined;

  return new BedrockRuntimeClient({
    region: process.env.AWS_REGION || "",
    ...(isLocalEnvironment && localCredentials
      ? { credentials: localCredentials }
      : {}),
  });
}
