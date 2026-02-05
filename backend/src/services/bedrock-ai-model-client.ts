import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { createBedrockRuntimeClient } from "../utils/bedrock-runtime-client";
import type {
  AiModelClient,
  AiModelConversationMessage,
  AiModelSystemMessage,
} from "./ai-model-client";

const DEFAULT_MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0";
const MODEL_ID = process.env.AWS_BEDROCK_MODEL_ID || DEFAULT_MODEL_ID;

export class BedrockAiModelClient implements AiModelClient {
  constructor(private readonly bedrockClient = createBedrockRuntimeClient()) { }

  async generateResponse(
    messages: readonly AiModelConversationMessage[],
    systemMessages: readonly AiModelSystemMessage[],
  ): Promise<string> {
    const response = await this.bedrockClient.send(
      new ConverseCommand({
        modelId: MODEL_ID,
        messages: messages.map((message) => ({
          role: message.role,
          content: [{ text: message.content }],
        })),
        system:
          systemMessages.length > 0
            ? systemMessages.map((systemMessage) => ({
              text: systemMessage.content,
            }))
            : undefined,
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
