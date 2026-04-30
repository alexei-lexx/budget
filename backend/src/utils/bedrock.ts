import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { ChatBedrockConverse } from "@langchain/aws";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { requireEnv, requireFloatEnv, requireIntEnv } from "./require-env";

const DEFAULT_AWS_BEDROCK_CONNECTION_TIMEOUT = 5000;
const DEFAULT_AWS_BEDROCK_MAX_TOKENS = 2000;
const DEFAULT_AWS_BEDROCK_MODEL_ID = "openai.gpt-oss-120b-1:0";
const DEFAULT_AWS_BEDROCK_REQUEST_TIMEOUT = 30000;
const DEFAULT_AWS_BEDROCK_TEMPERATURE = 0.2;

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

  // Time to establish the TCP connection before giving up
  const connectionTimeout = requireIntEnv(
    "AWS_BEDROCK_CONNECTION_TIMEOUT",
    DEFAULT_AWS_BEDROCK_CONNECTION_TIMEOUT,
  );
  // Total time cap for the full request/response cycle (non-streaming)
  const requestTimeout = requireIntEnv(
    "AWS_BEDROCK_REQUEST_TIMEOUT",
    DEFAULT_AWS_BEDROCK_REQUEST_TIMEOUT,
  );

  return new BedrockRuntimeClient({
    ...config,
    requestHandler: new NodeHttpHandler({
      connectionTimeout,
      requestTimeout,
    }),
  });
}

/** Creates a LangChain Bedrock chat model configured from environment variables. */
export function createBedrockChatModel(): ChatBedrockConverse {
  return new ChatBedrockConverse({
    model: requireEnv("AWS_BEDROCK_MODEL_ID", DEFAULT_AWS_BEDROCK_MODEL_ID),
    region: requireEnv("AWS_REGION"),
    maxTokens: requireIntEnv(
      "AWS_BEDROCK_MAX_TOKENS",
      DEFAULT_AWS_BEDROCK_MAX_TOKENS,
    ),
    temperature: requireFloatEnv(
      "AWS_BEDROCK_TEMPERATURE",
      DEFAULT_AWS_BEDROCK_TEMPERATURE,
    ),
    client: createBedrockRuntimeClient(),
  });
}
