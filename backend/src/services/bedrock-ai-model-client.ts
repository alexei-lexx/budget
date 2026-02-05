import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import {
  createBedrockRuntimeClient,
  loadBedrockMaxTokens,
  loadBedrockModelId,
  loadBedrockTemperature,
} from "../utils/bedrock-runtime-client";
import type {
  AiModelClient,
  AiModelConversationMessage,
  AiModelSystemMessage,
} from "./ai-model-client";

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
