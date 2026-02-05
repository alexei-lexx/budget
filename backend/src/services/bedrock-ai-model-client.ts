import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { createBedrockRuntimeClient } from "../utils/bedrock-runtime-client";
import type {
  AiModelClient,
  AiModelMessage,
  AiModelSystemMessage,
} from "./ai-model-client";

export class BedrockAiModelClient implements AiModelClient {
  constructor(
    private readonly bedrockClient = createBedrockRuntimeClient(),
    private readonly modelId = process.env.AWS_BEDROCK_MODEL_ID,
  ) {
    if (!this.modelId) {
      throw new Error("AWS_BEDROCK_MODEL_ID environment variable is required");
    }
  }

  async generateResponse(
    messages: readonly AiModelMessage[],
    systemMessages: readonly AiModelSystemMessage[],
  ): Promise<string> {
    const response = await this.bedrockClient.send(
      new ConverseCommand({
        modelId: this.modelId,
        messages: messages.map((message) => ({
          role: message.role,
          content: [{ text: message.content }],
        })),
        system: systemMessages.map((systemMessage) => ({
          text: systemMessage.content,
        })),
        inferenceConfig: {
          maxTokens: 450,
          temperature: 0.2,
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
