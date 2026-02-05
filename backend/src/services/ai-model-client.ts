export type AiModelRole = "system" | "user" | "assistant";

export interface AiModelMessage {
  role: AiModelRole;
  content: string;
}

export interface AiModelClient {
  generateResponse(messages: readonly AiModelMessage[]): Promise<string>;
}
