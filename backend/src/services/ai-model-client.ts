export interface AiModelMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AiModelClient {
  generateResponse(messages: readonly AiModelMessage[]): Promise<string>;
}
