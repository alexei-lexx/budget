import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { ChatBedrockConverse } from "@langchain/aws";
import { requireEnv, requireFloatEnv, requireIntEnv } from "./require-env";

const isLocalEnvironment =
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

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

/** Creates a LangChain Bedrock chat model configured from environment variables. */
export function createBedrockChatModel(): ChatBedrockConverse {
  return new ChatBedrockConverse({
    model: requireEnv("AWS_BEDROCK_MODEL_ID"),
    region: requireEnv("AWS_REGION"),
    maxTokens: requireIntEnv("AWS_BEDROCK_MAX_TOKENS"),
    temperature: requireFloatEnv("AWS_BEDROCK_TEMPERATURE"),
    client: createBedrockRuntimeClient(),
  });
}
