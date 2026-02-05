export interface AiModelConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiModelSystemMessage {
  role: "system";
  content: string;
}

export interface AiModelClient {
  generateResponse(
    conversationMessages: readonly AiModelConversationMessage[],
    systemMessages: readonly AiModelSystemMessage[],
  ): Promise<string>;
}
