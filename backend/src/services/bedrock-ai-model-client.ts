import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { createBedrockRuntimeClient } from "../utils/bedrock-runtime-client";
import type { AiModelClient, AiModelMessage } from "./ai-model-client";

const MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0";

export class BedrockAiModelClient implements AiModelClient {
  constructor(private readonly bedrockClient = createBedrockRuntimeClient()) {}

  async generateResponse(messages: readonly AiModelMessage[]): Promise<string> {
    const systemMessage = messages.find((message) => message.role === "system");
    const conversationMessages = messages.filter(
      (message) => message.role !== "system",
    );

    const response = await this.bedrockClient.send(
      new ConverseCommand({
        modelId: MODEL_ID,
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
