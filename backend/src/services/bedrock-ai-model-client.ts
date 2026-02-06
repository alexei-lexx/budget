import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import {
  createBedrockRuntimeClient,
  loadBedrockMaxTokens,
  loadBedrockModelId,
  loadBedrockTemperature,
} from "../utils/bedrock-runtime-client";
import type { AiModelClient, AiModelMessage } from "./ai-model-client";

interface NonSystemMessage extends AiModelMessage {
  role: "user" | "assistant";
}

interface SystemMessage extends AiModelMessage {
  role: "system";
}

function isSystemMessage(message: AiModelMessage): message is SystemMessage {
  return message.role === "system";
}

function isNonSystemMessage(
  message: AiModelMessage,
): message is NonSystemMessage {
  return !isSystemMessage(message);
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
    this.maxTokens = maxTokens ?? loadBedrockMaxTokens();
    this.modelId = modelId ?? loadBedrockModelId();
    this.temperature = temperature ?? loadBedrockTemperature();
  }

  async generateResponse(messages: readonly AiModelMessage[]): Promise<string> {
    const nonSystemMessages: NonSystemMessage[] = messages.filter((message) =>
      isNonSystemMessage(message),
    );
    const systemMessages: SystemMessage[] = messages.filter((message) =>
      isSystemMessage(message),
    );

    try {
      const response = await this.bedrockClient.send(
        new ConverseCommand({
          modelId: this.modelId,
          messages: nonSystemMessages.map((message) => ({
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
    } catch (error) {
      console.error("Error generating AI response:", error);
      throw error;
    }
  }
}
