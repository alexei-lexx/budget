import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import type {
  AiInsightsModelClient,
  AiInsightsModelMessage,
} from "./ai-insights-client";

const MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0";

export class BedrockAiInsightsClient implements AiInsightsModelClient {
  private bedrockClient: BedrockRuntimeClient;

  constructor(bedrockClient?: BedrockRuntimeClient) {
    this.bedrockClient =
      bedrockClient ||
      new BedrockRuntimeClient({
        region: process.env.AWS_REGION || "us-east-1",
      });
  }

  async generateResponse(
    messages: AiInsightsModelMessage[],
    systemPrompt: string,
  ): Promise<string> {
    const response = await this.bedrockClient.send(
      new ConverseCommand({
        modelId: MODEL_ID,
        messages: messages.map((message) => ({
          role: message.role,
          content: [{ text: message.content }],
        })),
        inferenceConfig: {
          maxTokens: 450,
          temperature: 0.2,
        },
        system: [
          {
            text: systemPrompt,
          },
        ],
      }),
    );

    const answerText = response.output?.message?.content
      ?.map((content) => ("text" in content ? content.text ?? "" : ""))
      .join("")
      .trim();

    if (!answerText) {
      throw new Error("AI response was empty");
    }

    return answerText;
  }
}
