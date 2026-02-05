import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import type {
  AiModelClient,
  AiModelMessage,
} from "../services/ai-model-client";

const MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0";

export class BedrockAiModelClient implements AiModelClient {
  private bedrockClient: BedrockRuntimeClient;

  constructor(bedrockClient?: BedrockRuntimeClient) {
    this.bedrockClient =
      bedrockClient ||
      new BedrockRuntimeClient({
        region: process.env.AWS_REGION || "",
        ...(process.env.AWS_ACCESS_KEY_ID && {
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
          },
        }),
      });
  }

  async generateResponse(messages: AiModelMessage[]): Promise<string> {
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
