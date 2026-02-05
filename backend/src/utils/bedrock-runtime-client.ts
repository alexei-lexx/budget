import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

export function createBedrockRuntimeClient(): BedrockRuntimeClient {
  return new BedrockRuntimeClient({
    region: process.env.AWS_REGION || "",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  });
}
