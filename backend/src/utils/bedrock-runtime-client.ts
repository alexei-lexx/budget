import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

const isLocalEnvironment =
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

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
