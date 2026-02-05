import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { createBedrockRuntimeClient } from "../utils/bedrock-runtime-client";
import type {
  AiModelClient,
  AiModelConversationMessage,
  AiModelSystemMessage,
} from "./ai-model-client";

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

export class BedrockAiModelClient implements AiModelClient {
  private readonly maxTokens: number;
  private readonly modelId: string;
  private readonly temperature: number;

  constructor(
    private readonly bedrockClient = createBedrockRuntimeClient(),
    maxTokens?: number,
    modelId?: string,
    temperature?: number,
  ) {
    this.maxTokens =
      maxTokens ??
      parseIntEnv(
        "AWS_BEDROCK_MAX_TOKENS",
        requireEnv("AWS_BEDROCK_MAX_TOKENS"),
      );

    this.modelId = modelId ?? requireEnv("AWS_BEDROCK_MODEL_ID");

    this.temperature =
      temperature ??
      parseFloatEnv(
        "AWS_BEDROCK_TEMPERATURE",
        requireEnv("AWS_BEDROCK_TEMPERATURE"),
      );
  }

  async generateResponse(
    conversationMessages: readonly AiModelConversationMessage[],
    systemMessages: readonly AiModelSystemMessage[],
  ): Promise<string> {
    const response = await this.bedrockClient.send(
      new ConverseCommand({
        modelId: this.modelId,
        messages: conversationMessages.map((message) => ({
          role: message.role,
          content: [{ text: message.content }],
        })),
        system: systemMessages.map((systemMessage) => ({
          text: systemMessage.content,
        })),
        inferenceConfig: {
          maxTokens: this.maxTokens,
          temperature: this.temperature,
        },
      }),
    );

    const answerText = response.output?.message?.content
      ?.map((content) => ("text" in content ? (content.text ?? "") : ""))
      .join("")
      .trim();

    if (!answerText) {
      throw new Error("AI response was empty");
    }

    return answerText;
  }
}
