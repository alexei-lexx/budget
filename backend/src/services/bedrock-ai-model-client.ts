import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { createBedrockRuntimeClient } from "../utils/bedrock-runtime-client";
import type { AiModelClient, AiModelMessage } from "./ai-model-client";

export class BedrockAiModelClient implements AiModelClient {
  constructor(
    private readonly bedrockClient = createBedrockRuntimeClient(),
    private readonly modelId = process.env.AWS_BEDROCK_MODEL_ID,
  ) {
    if (!this.modelId) {
      throw new Error("AWS_BEDROCK_MODEL_ID environment variable is required");
    }
  }

  async generateResponse(messages: readonly AiModelMessage[]): Promise<string> {
    const systemMessage = messages.find((message) => message.role === "system");
    const conversationMessages = messages.filter(
      (message) => message.role !== "system",
    );

    const response = await this.bedrockClient.send(
      new ConverseCommand({
        modelId: this.modelId,
        messages: conversationMessages.map((message) => ({
          role: message.role,
          content: [{ text: message.content }],
        })),
        inferenceConfig: {
          maxTokens: 450,
          temperature: 0.2,
        },
        system: systemMessage
          ? [
              {
                text: systemMessage.content,
              },
            ]
          : undefined,
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
