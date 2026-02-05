export type AiModelRole = "user" | "assistant";

export interface AiModelMessage {
  role: AiModelRole;
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
