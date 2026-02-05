export interface AiModelMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiModelSystemMessage {
  role: "system";
  content: string;
}

export interface AiModelClient {
  generateResponse(
    messages: readonly AiModelMessage[],
    systemMessages: readonly AiModelSystemMessage[],
  ): Promise<string>;
}
